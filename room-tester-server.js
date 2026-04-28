const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { randomUUID } = require("crypto");
const { establecer_conexion, closeConnection } = require("./tcp-conexion/conexion");
const { getSession, getSessionPayload, registerEventsRoute, seedSession, setSessionMode, setSessionFlow, deleteSession, touchSessionViewer, listSessionIds } = require("./tcp-conexion/websocket");
const { getTraceFilePath } = require("./tcp-conexion/message-trace");
const { lookupCardById } = require("./card-lookup");
const {
  normalizeRoomMeta,
  normalizeClientFlow,
  parseAllowedHosts,
  resolveServerBase,
  resolveConnectionOptions,
} = require("./server-utils");

const app = express();
const host = process.env.ROOM_TESTER_HOST || "0.0.0.0";
const port = Number(process.env.ROOM_TESTER_PORT || 8088);
const frontEndDir = path.join(__dirname, "front-end");
const viewerIndexPath = path.join(frontEndDir, "index.html");
const testerPath = path.join(frontEndDir, "room-tester.html");
const picsDir = path.join(__dirname, "pics");
const ROOM_API_BASE = process.env.ROOM_API_BASE || "http://server.evolutionygo.com:7922";
const DEFAULT_DUEL_PORT = Number(process.env.DUEL_SERVER_PORT || 7911);
const ALLOWED_ROOM_API_HOSTS = parseAllowedHosts(process.env.ROOM_API_ALLOWED_HOSTS);
const VIEWER_HEARTBEAT_TIMEOUT_MS = Number(process.env.VIEWER_HEARTBEAT_TIMEOUT_MS || 20_000);
const VIEWER_HEARTBEAT_SWEEP_MS = Number(process.env.VIEWER_HEARTBEAT_SWEEP_MS || 5_000);
const CARD_IMAGE_REMOTE_TEMPLATE = process.env.CARD_IMAGE_REMOTE_TEMPLATE || "https://images.ygoprodeck.com/images/cards/{id}.jpg";

app.disable("x-powered-by");
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
registerEventsRoute(app);

app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(viewerIndexPath);
});

app.get(["/room-tester", "/room-tester.html"], (_req, res) => {
  res.sendFile(testerPath);
});

app.use("/static", express.static(frontEndDir));
app.use("/pics", express.static(picsDir));
app.use(express.static(frontEndDir));

function resolveRemoteCardImageUrl(cardId) {
  return CARD_IMAGE_REMOTE_TEMPLATE.replace(/\{id\}/g, String(cardId));
}

function getLocalCardImageCandidates(cardId) {
  return [
    path.join(picsDir, `${cardId}.jpg`),
    path.join(picsDir, `${cardId}.jpeg`),
    path.join(picsDir, `${cardId}.png`),
  ];
}

function sendLocalCardImage(cardId, res) {
  const fs = require("fs");
  const candidates = getLocalCardImageCandidates(cardId);
  const foundPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!foundPath) {
    return false;
  }

  const extension = path.extname(foundPath).toLowerCase();
  const contentType = extension === ".png" ? "image/png" : "image/jpeg";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  fs.createReadStream(foundPath).pipe(res);
  return true;
}

function resolveRoomApiBaseOrFail(serverBaseInput) {
  return resolveServerBase(serverBaseInput, ROOM_API_BASE, {
    allowedHosts: ALLOWED_ROOM_API_HOSTS,
  });
}

function roomNeedsPassword(room) {
  const value = room?.needpass;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
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

app.get("/api/card/:id", (req, res) => {
  const cardId = Number(req.params.id);
  if (!Number.isFinite(cardId) || cardId <= 0) {
    res.status(400).json({ success: false, error: "invalid card id" });
    return;
  }

  try {
    const parsed = lookupCardById(cardId, path.join(__dirname, "data"));
    res.status(200).json({ success: true, card: parsed });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/card-image/:id", async (req, res) => {
  const cardId = Number(req.params.id);
  if (!Number.isFinite(cardId) || cardId <= 0) {
    res.status(400).end();
    return;
  }

  const remoteUrl = resolveRemoteCardImageUrl(cardId);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (upstream.ok) {
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
      return;
    }
  } catch (_) {
    // Intentionally fall back to local assets below.
  }

  if (sendLocalCardImage(cardId, res)) {
    return;
  }

  res.status(404).end();
});

app.get("/api/rooms", async (req, res) => {
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

async function startWatchSession(req, res) {
  const { id, room, serverBase, duelPort, mode, nickname, loginPassword, roomPassword, asSpectator, viewerBaseUrl, clientFlow, traceMessages } = req.body;

  if (!id) {
    res.status(400).json({ success: false, error: "id is required" });
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
    fallbackHost: process.env.DUEL_SERVER_HOST || "server.evolutionygo.com",
  });

  connectionOptions.openMode = mode === "debug" ? "debug" : "viewer";
  connectionOptions.playerName = loginPassword ? `${nickname || "WebsiteView"}:${loginPassword}` : (nickname || "WebsiteView");
  connectionOptions.roomPassword = roomPassword || "";
  connectionOptions.asSpectator = asSpectator !== false;
  connectionOptions.viewerBaseUrl = viewerBaseUrl || `${req.protocol}://${req.get("host")}`;
  connectionOptions.clientFlow = resolvedClientFlow;
  connectionOptions.traceMessages = traceMessages !== false;
  const requiresPasswordValidation = resolvedClientFlow === "edopro" && roomNeedsPassword(normalizedRoom);
  connectionOptions.autoOpenViewer = true;
  connectionOptions.requireHandshakeValidation = requiresPasswordValidation;
  connectionOptions.handshakeTimeoutMs = 7000;

  seedSession(uniqueId, normalizedRoom);
  setSessionMode(uniqueId, connectionOptions.openMode);
  setSessionFlow(uniqueId, resolvedClientFlow);
  touchSessionViewer(uniqueId, Date.now());
  try {
    if (!requiresPasswordValidation) {
      establecer_conexion(String(id), uniqueId, normalizedRoom, connectionOptions);
    } else {
      await new Promise((resolve, reject) => {
        establecer_conexion(String(id), uniqueId, normalizedRoom, {
          ...connectionOptions,
          onHandshakeSuccess: resolve,
          onHandshakeError: reject,
        });
      });
    }

    res.status(200).json({
      success: true,
      id,
      uniqueId,
      clientFlow: resolvedClientFlow,
      traceMessages: connectionOptions.traceMessages,
      traceFile: getTraceFilePath(uniqueId),
    });
  } catch (error) {
    closeConnection(uniqueId);
    deleteSession(uniqueId);
    const normalizedError = (error && typeof error === "object") ? error : {};
    const errorCode = String(normalizedError.errorKey || normalizedError.error || "WATCH_START_FAILED");
    const status = errorCode === "ROOM_PASSWORD_INVALID" ? 401 : 400;

    res.status(status).json({
      success: false,
      error: normalizedError.message || "Unable to open room",
      errorCode,
      details: normalizedError,
    });
  }
}

app.post(["/api/watch", "/api/idroom"], startWatchSession);

app.get("/api/session/:uniqueId", (req, res) => {
  const includeReplay = req.query.includeReplay !== "0";
  const includeTransport = req.query.includeTransport === "1";
  const consumeReplay = req.query.consumeReplay === "1";
  const session = getSessionPayload(req.params.uniqueId, { includeReplay, includeTransport, consumeReplay });

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (!session) {
    res.status(404).json({ success: false, error: "session not found" });
    return;
  }

  res.status(200).json({ success: true, session });
});

app.post("/api/session/:uniqueId/close", (req, res) => {
  const uniqueId = req.params.uniqueId;
  const closed = closeConnection(uniqueId);
  const deleted = deleteSession(uniqueId);

  res.status(200).json({
    success: true,
    uniqueId,
    closed,
    deleted,
  });
});

app.post("/api/session/:uniqueId/ping", (req, res) => {
  const uniqueId = req.params.uniqueId;
  const session = getSession(uniqueId);
  if (!session) {
    res.status(404).json({ success: false, error: "session not found" });
    return;
  }

  const lastViewerPingAt = touchSessionViewer(uniqueId, Date.now());
  res.status(200).json({
    success: true,
    uniqueId,
    lastViewerPingAt,
  });
});

setInterval(() => {
  const now = Date.now();
  const sessionIds = listSessionIds();
  sessionIds.forEach((uniqueId) => {
    const session = getSession(uniqueId);
    if (!session) {
      return;
    }

    if (session.mode !== "viewer") {
      return;
    }

    const lastPing = Number(session.lastViewerPingAt || 0);
    if (!Number.isFinite(lastPing) || now - lastPing <= VIEWER_HEARTBEAT_TIMEOUT_MS) {
      return;
    }

    closeConnection(uniqueId);
    deleteSession(uniqueId);
  });
}, VIEWER_HEARTBEAT_SWEEP_MS).unref();

app.listen(port, host, () => {
  console.log(`Room tester available at http://localhost:${port}`);
  console.log(`Viewer home: ${viewerIndexPath}`);
  console.log(`Room tester: ${testerPath}`);
});
