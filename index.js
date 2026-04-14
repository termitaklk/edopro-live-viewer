const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomUUID } = require('crypto');
const { establecer_conexion } = require('./tcp-conexion/conexion');
const { getSessionPayload, registerEventsRoute, seedSession, setSessionMode, setSessionFlow } = require('./tcp-conexion/websocket');
const { lookupCardById } = require('./card-lookup');
const {
    normalizeRoomMeta,
    normalizeClientFlow,
    parseAllowedHosts,
    resolveServerBase,
    resolveConnectionOptions,
} = require('./server-utils');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOM_API_BASE = process.env.ROOM_API_BASE || 'http://server.evolutionygo.com:7922';
const DEFAULT_DUEL_PORT = Number(process.env.DUEL_SERVER_PORT || 7911);
const ALLOWED_ROOM_API_HOSTS = parseAllowedHosts(process.env.ROOM_API_ALLOWED_HOSTS);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'front-end')));
app.use('/pics', express.static(path.join(__dirname, 'pics')));
registerEventsRoute(app);

function resolveRoomApiBaseOrFail(serverBaseInput) {
    return resolveServerBase(serverBaseInput, ROOM_API_BASE, {
        allowedHosts: ALLOWED_ROOM_API_HOSTS,
    });
}

async function fetchRoomApiJson(serverBase) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
        const response = await fetch(`${serverBase}/api/getrooms`, { signal: controller.signal });
        const text = await response.text();
        return { response, text };
    } finally {
        clearTimeout(timeout);
    }
}

app.get('/api/card-image/:id', async (req, res) => {
    const cardId = Number(req.params.id);
    if (!Number.isFinite(cardId) || cardId <= 0) {
        res.status(400).end();
        return;
    }

    const localPath = path.join(__dirname, 'pics', `${cardId}.jpg`);
    const fs = require('fs');
    if (fs.existsSync(localPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(localPath).pipe(res);
        return;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const upstream = await fetch(`https://images.ygoprodeck.com/images/cards/${cardId}.jpg`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!upstream.ok) {
            res.status(upstream.status).end();
            return;
        }

        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.end(buf);
    } catch {
        res.status(502).end();
    }
});

app.get('/api/card/:id', (req, res) => {
    const cardId = Number(req.params.id);
    if (!Number.isFinite(cardId) || cardId <= 0) {
        res.status(400).json({ success: false, error: 'invalid card id' });
        return;
    }

    try {
        const parsed = lookupCardById(cardId, path.join(__dirname, 'data'));
        res.status(200).json({ success: true, card: parsed });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});

app.get('/api/rooms', async (req, res) => {
    let serverBase;
    try {
        serverBase = resolveRoomApiBaseOrFail(req.query.serverBase);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
        return;
    }

    try {
        const { response, text } = await fetchRoomApiJson(serverBase);

        if (!response.ok) {
            res.status(response.status).send(text);
            return;
        }

        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.rooms)) {
            parsed.rooms = parsed.rooms.map((room) => normalizeRoomMeta(room));
        }
        res.status(200).json(parsed);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});

function startWatchSession(req, res) {
    const { id, room, serverBase, duelPort, mode, nickname, loginPassword, roomPassword, asSpectator, clientFlow, viewerBaseUrl } = req.body;

    if (!id) {
        res.status(400).json({ success: false, error: 'id is required' });
        return;
    }

    let sanitizedServerBase;
    try {
        sanitizedServerBase = resolveRoomApiBaseOrFail(serverBase);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
        return;
    }

    const uniqueId = randomUUID();
    const normalizedRoom = normalizeRoomMeta(room);
    const resolvedClientFlow = normalizeClientFlow(clientFlow, normalizedRoom);
    const connectionOptions = resolveConnectionOptions(sanitizedServerBase, duelPort, {
        defaultRoomApiBase: ROOM_API_BASE,
        defaultDuelPort: DEFAULT_DUEL_PORT,
        fallbackHost: process.env.DUEL_SERVER_HOST || 'us.projectignis.org',
    });

    connectionOptions.openMode = mode === 'debug' ? 'debug' : 'viewer';
    connectionOptions.playerName = loginPassword ? `${nickname || 'WebsiteView'}:${loginPassword}` : (nickname || 'WebsiteView');
    connectionOptions.roomPassword = roomPassword || '';
    connectionOptions.asSpectator = asSpectator !== false;
    connectionOptions.clientFlow = resolvedClientFlow;
    connectionOptions.viewerBaseUrl = viewerBaseUrl || `${req.protocol}://${req.get('host')}`;
    connectionOptions.autoOpenViewer = false;

    console.log(`Recibido ID: ${id} con uniqueId: ${uniqueId}`);
    seedSession(uniqueId, normalizedRoom);
    setSessionMode(uniqueId, connectionOptions.openMode);
    setSessionFlow(uniqueId, resolvedClientFlow);
    establecer_conexion(String(id), uniqueId, normalizedRoom, connectionOptions);
    res.status(200).json({ success: true, id, uniqueId, clientFlow: resolvedClientFlow });
}

app.post(['/api/watch', '/api/idroom'], startWatchSession);

app.get('/api/session/:uniqueId', (req, res) => {
    const includeReplay = req.query.includeReplay !== '0';
    const consumeReplay = req.query.consumeReplay === '1';
    const session = getSessionPayload(req.params.uniqueId, { includeReplay, consumeReplay });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!session) {
        res.status(404).json({ success: false, error: 'session not found' });
        return;
    }

    res.status(200).json({ success: true, session });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
