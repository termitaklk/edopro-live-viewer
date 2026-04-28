const clients = new Set();
const sessions = new Map();
const cleanupTimers = new Map();

const REPLAY_EVENTS_LIMIT = 180;
const LAST_EVENTS_LIMIT = 80;
const EDOPRO_LAST_EVENTS_LIMIT = 30;
const STORE_EDOPRO_GAME_REPLAY = true;
const EDOPRO_REPLAY_EVENTS_LIMIT = 1500;
const TRANSPORT_EVENTS_LIMIT = 12000;
const MAX_VISIBLE_HAND_CARDS = 120;

function normalizeClientFlow(value, fallback = 'edopro') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'edopro' || normalized === 'mercury') {
        return normalized;
    }
    return fallback === 'mercury' ? 'mercury' : 'edopro';
}

function mapProtocolPlayerByFlow(player, clientFlow) {
    void clientFlow;
    const numeric = Number(player);
    if (!Number.isFinite(numeric)) {
        return player;
    }
    return numeric;
}

function getStartingPlayerFromTypeChange(rawTypeChange) {
    const numeric = Number(rawTypeChange);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return (numeric & 0x1) ? 1 : 0;
}

function getTurnPlayerFromSeed(startingPlayer, turnCount) {
    const starter = Number(startingPlayer);
    const turn = Number(turnCount);
    if (!Number.isFinite(starter) || !Number.isFinite(turn) || turn <= 0) {
        return null;
    }
    return (starter + ((turn - 1) % 2)) % 2;
}

function clearSessionCleanup(uniqueId) {
    const timer = cleanupTimers.get(uniqueId);
    if (timer) {
        clearTimeout(timer);
        cleanupTimers.delete(uniqueId);
    }
}

function scheduleSessionCleanup(uniqueId, delayMs = 60_000) {
    if (!uniqueId) {
        return;
    }
    clearSessionCleanup(uniqueId);
    const timer = setTimeout(() => {
        sessions.delete(uniqueId);
        cleanupTimers.delete(uniqueId);
    }, delayMs);
    cleanupTimers.set(uniqueId, timer);
}

function normalizeCardCode(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }
    return numeric >>> 0;
}

function createHiddenCards(count) {
    return Array.from({ length: Number(count) || 0 }, (_, index) => `hidden-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`);
}

function removeLastCard(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
        return [];
    }

    return cards.slice(0, -1);
}

function normalizeLocation(location) {
    const numeric = Number(location);
    if (!Number.isFinite(numeric)) {
        return location;
    }
    if (numeric === 0x01 || numeric === 0x02 || numeric === 0x04 || numeric === 0x08 || numeric === 0x10 || numeric === 0x20 || numeric === 0x40 || numeric === 0x80) {
        return numeric;
    }
    if (numeric & 0x04) return 0x04;
    if (numeric & 0x08) return 0x08;
    if (numeric & 0x10) return 0x10;
    if (numeric & 0x20) return 0x20;
    if (numeric & 0x02) return 0x02;
    if (numeric & 0x01) return 0x01;
    if (numeric & 0x40) return 0x40;
    if (numeric & 0x80) return 0x80;
    return numeric;
}

function getFieldCellKey(controller, location, sequence) {
    const normalizedLocation = normalizeLocation(location);
    if (sequence === null || sequence === undefined) {
        if (normalizedLocation === 0x10) {
            return controller === 0 ? 'graveTop' : 'graveBottom';
        }
        return null;
    }

    const seq = Number(sequence);
    const slot = getFieldSlotByController(controller, seq);

    if (normalizedLocation === 0x08 && seq >= 0 && seq <= 4) {
        return `${controller === 0 ? 'a' : 'c'}${slot}`;
    }

    if (normalizedLocation === 0x04 && seq >= 0 && seq <= 4) {
        return `${controller === 0 ? 'b' : 'd'}${slot}`;
    }

    if (normalizedLocation === 0x10) {
        return controller === 0 ? 'graveTop' : 'graveBottom';
    }

    return null;
}

function sanitizeReplayPayload(type, payload = {}) {
    if (type === 'game_msg') {
        const {
            payloadHex,
            queryHex,
            blocks,
            hex,
            segment,
            ...rest
        } = payload;
        rest.clientFlow = normalizeClientFlow(rest.clientFlow, 'edopro');

        if (Array.isArray(rest.cards)) {
            rest.cards = rest.cards.map((card) => ({
                code: normalizeCardCode(card?.code),
                position: card?.position ?? null,
                sequence: card?.sequence ?? null,
                location: card?.location ?? null,
                controller: card?.controller ?? null,
            }));
        }

        return rest;
    }

    if (type === 'duel_start' || type === 'duel_end' || type === 'time_limit' || type === 'waiting_state') {
        return { ...payload };
    }

    return null;
}

function shouldStoreReplayEvent(type) {
    return type === 'game_msg' || type === 'duel_start' || type === 'duel_end' || type === 'time_limit' || type === 'waiting_state' || type === 'reload_field';
}

function shouldStoreLastEvent(type) {
    return (
        type === 'connection_open' ||
        type === 'connection_end' ||
        type === 'connection_error' ||
        type === 'stoc_error' ||
        type === 'waiting_state' ||
        type === 'waiting_player_enter' ||
        type === 'waiting_player_change' ||
        type === 'waiting_watch_change' ||
        type === 'duel_start' ||
        type === 'duel_end' ||
        type === 'reload_field' ||
        type === 'time_limit' ||
        type === 'game_msg'
    );
}

function normalizeSpectatorPhase(phase) {
    const numeric = Number(phase);
    if (!Number.isFinite(numeric)) {
        return null;
    }

    if (numeric === 0x01) return 'phase:draw';
    if (numeric === 0x02) return 'phase:standby';
    if (numeric === 0x04) return 'phase:main1';
    if (numeric === 0x08 || numeric === 0x10 || numeric === 0x20 || numeric === 0x40 || numeric === 0x80) return 'phase:battle';
    if (numeric === 0x100) return 'phase:main2';
    if (numeric === 0x200) return 'phase:end';
    return `phase:${numeric}`;
}

function shouldStoreTransportEvent(type) {
    return (
        type === 'socket_send' ||
        type === 'socket_frame' ||
        type === 'socket_segment' ||
        type === 'socket_buffer_pending' ||
        type === 'socket_buffer_reset' ||
        type === 'socket_unhandled'
    );
}

function sanitizeLastEventPayload(type, payload = {}) {
    const sanitized = { ...payload };
    sanitized.clientFlow = normalizeClientFlow(payload.clientFlow, 'edopro');

    if (type === 'game_msg' && typeof sanitized.payloadHex === 'string' && sanitized.payloadHex.length > 160) {
        sanitized.payloadHex = `${sanitized.payloadHex.slice(0, 160)}...`;
    }

    if (typeof sanitized.segment === 'string' && sanitized.segment.length > 160) {
        sanitized.segment = `${sanitized.segment.slice(0, 160)}...`;
    }

    return sanitized;
}

function sanitizeTransportPayload(type, payload = {}) {
    const sanitized = { ...payload };
    sanitized.clientFlow = normalizeClientFlow(payload.clientFlow, 'edopro');

    if (typeof sanitized.hex === 'string') {
        sanitized.hex = sanitized.hex.toLowerCase();
    }
    if (typeof sanitized.segment === 'string') {
        sanitized.segment = sanitized.segment.toLowerCase();
    }
    if (typeof sanitized.pendingHex === 'string') {
        sanitized.pendingHex = sanitized.pendingHex.toLowerCase();
    }
    if (typeof sanitized.payloadHex === 'string') {
        sanitized.payloadHex = sanitized.payloadHex.toLowerCase();
    }

    return sanitized;
}

function pushBounded(list, value, limit) {
    if (!Array.isArray(list) || !Number.isFinite(limit) || limit <= 0) {
        return;
    }

    list.push(value);
    if (list.length > limit) {
        list.splice(0, list.length - limit);
    }
}

function applyFieldCard(session, controller, location, sequence, code, position) {
    const fieldKey = getFieldCellKey(controller, location, sequence);
    if (!fieldKey) {
        return;
    }

    const existing = session.field[fieldKey] || null;
    const resolvedCode = code ?? existing?.code ?? null;
    const resolvedPosition = position ?? existing?.position ?? null;

    if (resolvedCode === null || resolvedCode === undefined) {
        if (resolvedPosition === null || resolvedPosition === undefined) {
            delete session.field[fieldKey];
        } else {
            session.field[fieldKey] = {
                ...(existing || {}),
                controller,
                location: normalizeLocation(location),
                sequence,
                position: resolvedPosition,
            };
        }
        return;
    }

    session.field[fieldKey] = {
        code: resolvedCode,
        controller,
        location: normalizeLocation(location),
        sequence,
        position: resolvedPosition,
    };
}

function getZoneSnapshotKey(controller, location) {
    return `${controller}:${normalizeLocation(location)}`;
}

function getCardSnapshotValue(card, fallbackCode = null) {
    if (!card) return null;
    return {
        code: normalizeCardCode(card.code) ?? normalizeCardCode(fallbackCode) ?? null,
        controller: Number(card.controller),
        location: normalizeLocation(card.location),
        sequence: Number(card.sequence),
        position: card.position ?? null,
        flags: card.flags ?? null,
    };
}

function areCardSnapshotsEqual(left, right) {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return (
        Number(left.controller) === Number(right.controller) &&
        Number(left.location) === Number(right.location) &&
        Number(left.sequence) === Number(right.sequence) &&
        Number(left.code ?? null) === Number(right.code ?? null) &&
        Number(left.position ?? null) === Number(right.position ?? null) &&
        Number(left.flags ?? null) === Number(right.flags ?? null)
    );
}

function buildZoneSnapshot(cards, controller, location, fallbackCode = null) {
    const snapshot = {};
    (Array.isArray(cards) ? cards : []).forEach((card) => {
        const sequence = Number(card?.sequence);
        if (!Number.isFinite(sequence)) {
            return;
        }
        snapshot[String(sequence)] = getCardSnapshotValue({
            ...card,
            controller,
            location,
            sequence,
        }, fallbackCode);
    });
    return snapshot;
}

function getFieldKeyCandidates(controller, location, sequence) {
    const candidates = [];
    const raw = Number(location);
    const push = (loc) => {
        const key = getFieldCellKey(controller, loc, sequence);
        if (key && !candidates.includes(key)) {
            candidates.push(key);
        }
    };

    if (Number.isFinite(raw)) {
        if (raw & 0x04) push(0x04);
        if (raw & 0x08) push(0x08);
        if (raw & 0x10) push(0x10);
    }
    push(location);
    return candidates;
}

function removeFallbackFieldCardFromMove(session, payload, moveCode) {
    const prevLocation = normalizeLocation(payload.previousLocation);
    const preferredLocations = (prevLocation === 0x04 || prevLocation === 0x08) ? [prevLocation] : [0x04, 0x08];
    const controllers = [payload.previousController, payload.currentController]
        .map((value) => Number(value))
        .filter((value, index, array) => Number.isFinite(value) && array.indexOf(value) === index);

    const entries = Object.entries(session.field || {});
    const candidates = entries
        .map(([key, card]) => ({ key, card }))
        .filter(({ card }) => !!card)
        .filter(({ card }) => {
            const loc = normalizeLocation(card.location);
            return loc === 0x04 || loc === 0x08;
        })
        .filter(({ card }) => controllers.length === 0 || controllers.includes(Number(card.controller)));

    const byCodeAndLocation = candidates.find(({ card }) =>
        moveCode !== null &&
        normalizeCardCode(card.code) === moveCode &&
        preferredLocations.includes(normalizeLocation(card.location))
    );
    if (byCodeAndLocation) {
        delete session.field[byCodeAndLocation.key];
        return byCodeAndLocation.key;
    }

    const byCode = candidates.find(({ card }) =>
        moveCode !== null &&
        normalizeCardCode(card.code) === moveCode
    );
    if (byCode) {
        delete session.field[byCode.key];
        return byCode.key;
    }

    const bySequenceAndLocation = candidates.find(({ card }) =>
        Number(card.sequence) === Number(payload.previousSequence) &&
        preferredLocations.includes(normalizeLocation(card.location))
    );
    if (bySequenceAndLocation) {
        delete session.field[bySequenceAndLocation.key];
        return bySequenceAndLocation.key;
    }

    return null;
}

function getFieldSlotByController(controller, sequence) {
    const seq = Number(sequence);
    if (!Number.isFinite(seq)) {
        return null;
    }
    // Top side is mirrored, bottom side keeps natural order.
    return Number(controller) === 0 ? 5 - seq : seq + 1;
}

function getFallbackLp(session, playerKey) {
    const roomStart = Number(session?.room?.start_lp);
    if (Number.isFinite(roomStart) && roomStart > 0) {
        return roomStart;
    }
    const existing = Number(session?.playerLp?.[playerKey]);
    if (Number.isFinite(existing) && existing > 0) {
        return existing;
    }
    return 8000;
}

function ensureSession(uniqueId) {
    if (!uniqueId) {
        return null;
    }

    if (!sessions.has(uniqueId)) {
        sessions.set(uniqueId, {
            uniqueId,
            room: null,
            phase: 'waiting',
            turnPlayer: null,
            startingPlayer: null,
            players: [],
            spectators: 0,
            spectatorProtocol: null,
            spectatorZones: null,
            typeChange: null,
            rps: null,
            turnCount: 0,
            playerTimes: { 0: null, 1: null },
            playerTimeUpdatedAt: { 0: null, 1: null },
            hands: { 0: [], 1: [] },
            field: {},
            fieldUpdateSnapshots: {},
            handSnapshots: { 0: { count: 0 }, 1: { count: 0 } },
            graveSnapshots: { 0: [], 1: [] },
            banishedSnapshots: { 0: [], 1: [] },
            graves: { 0: [], 1: [] },
            banished: { 0: [], 1: [] },
            pendingReveal: null,
            replayEvents: [],
            transportEvents: [],
            lastEvents: [],
            mode: 'viewer',
            clientFlow: 'edopro',
            lastViewerPingAt: Date.now(),
        });
    }

    clearSessionCleanup(uniqueId);
    return sessions.get(uniqueId);
}

function isEdoproSession(session) {
    return normalizeClientFlow(session?.clientFlow, 'edopro') === 'edopro';
}

function addEventToSession(session, type, payload) {
    const edoproSession = isEdoproSession(session);

    if (shouldStoreTransportEvent(type)) {
        pushBounded(session.transportEvents, {
            type,
            payload: sanitizeTransportPayload(type, payload),
            timestamp: new Date().toISOString(),
        }, TRANSPORT_EVENTS_LIMIT);
    }

    if (shouldStoreLastEvent(type)) {
        // In EDOPro we intentionally avoid storing every game_msg as lastEvents
        // because the message rate is high and this can create GC pressure.
        if (!(edoproSession && type === 'game_msg')) {
            pushBounded(session.lastEvents, {
            type,
            payload: sanitizeLastEventPayload(type, payload),
            timestamp: new Date().toISOString(),
            }, edoproSession ? EDOPRO_LAST_EVENTS_LIMIT : LAST_EVENTS_LIMIT);
        }
    }

    if (shouldStoreReplayEvent(type)) {
        if (edoproSession && type === 'game_msg' && !STORE_EDOPRO_GAME_REPLAY) {
            return;
        }

        const replayPayload = sanitizeReplayPayload(type, payload);
        if (replayPayload) {
            pushBounded(session.replayEvents, {
                type,
                payload: replayPayload,
                timestamp: new Date().toISOString(),
            }, edoproSession ? EDOPRO_REPLAY_EVENTS_LIMIT : REPLAY_EVENTS_LIMIT);
        }
    }
}

function updateSession(uniqueId, type, payload = {}) {
    const session = ensureSession(uniqueId);
    if (!session) return;

    if (type === 'connection_open' && payload.clientFlow) {
        session.clientFlow = normalizeClientFlow(payload.clientFlow, session.clientFlow);
    }

    const payloadFlow = normalizeClientFlow(payload.clientFlow, session.clientFlow);
    const shouldIgnoreByFlow =
        type !== 'connection_open' &&
        payload.clientFlow !== undefined &&
        payloadFlow !== normalizeClientFlow(session.clientFlow, 'edopro');

    if (shouldIgnoreByFlow) {
        return;
    }

    if (type === 'connection_open' && payload.mode) {
        session.mode = payload.mode;
    }

    if (type === 'connection_open') {
        clearSessionCleanup(uniqueId);
    }

    if (type === 'connection_open' && payload.room) {
        session.room = payload.room;
        session.clientFlow = normalizeClientFlow(payload.room.roomClient, session.clientFlow);
        // Do not seed turn timers from room time_limit.
        // We only trust real per-turn timer updates from `time_limit` events.
        session.playerTimes = { 0: null, 1: null };
        session.playerTimeUpdatedAt = { 0: null, 1: null };
        if (Array.isArray(payload.room.users) && payload.room.users.length > 0) {
            session.players = payload.room.users.map((user) => ({
                name: user.name,
                position: user.pos,
                status: 'NOT_READY',
            }));
        }
    }

    const edoproSession = isEdoproSession(session);
    if (edoproSession) {
        if (type === 'waiting_state') {
            session.phase = 'waiting';
            session.turnPlayer = null;
            session.startingPlayer = null;
            session.turnCount = 0;
        }

        if (type === 'duel_start') {
            session.phase = 'dueling';
            session.startingPlayer = null;
            session.turnCount = 0;
        }

        if (type === 'duel_end') {
            session.phase = 'ended';
            scheduleSessionCleanup(uniqueId, 120_000);
        }

        if (type === 'time_limit' && payload.player !== null && payload.player !== undefined) {
            session.playerTimes[String(payload.player)] = payload.timeLeft ?? session.playerTimes[String(payload.player)] ?? null;
            session.playerTimeUpdatedAt[String(payload.player)] = Date.now();
        }

        if (type === 'connection_end' || type === 'connection_error') {
            scheduleSessionCleanup(uniqueId, 30_000);
        }
    }

    if (type === 'waiting_type_change') {
        session.typeChange = payload.type ?? null;
        const seededStartingPlayer = getStartingPlayerFromTypeChange(session.typeChange);
        if (seededStartingPlayer !== null) {
            session.startingPlayer = seededStartingPlayer;
            session.turnPlayer = getTurnPlayerFromSeed(session.startingPlayer, session.turnCount);
        }
    }

    if (type === 'waiting_state') {
        session.phase = 'waiting';
        session.turnPlayer = null;
        session.startingPlayer = null;
        session.turnCount = 0;
        session.hands = { 0: [], 1: [] };
        session.field = {};
        session.fieldUpdateSnapshots = {};
        session.handSnapshots = { 0: { count: 0 }, 1: { count: 0 } };
        session.graveSnapshots = { 0: [], 1: [] };
        session.banishedSnapshots = { 0: [], 1: [] };
        session.graves = { 0: [], 1: [] };
        session.banished = { 0: [], 1: [] };
        session.pendingReveal = null;
        session.replayEvents = [];
    }

    if (type === 'waiting_player_enter') {
        const existing = session.players.find((player) => player.position === payload.position);
        if (existing) {
            existing.name = payload.name;
        } else {
            session.players.push({
                name: payload.name,
                position: payload.position,
                status: 'NOT_READY',
            });
            session.players.sort((a, b) => a.position - b.position);
        }
    }

    if (type === 'waiting_player_change') {
        if (payload.stateName === 'SPECTATE' || payload.stateName === 'LEAVE') {
            session.players = session.players.filter((player) => player.position !== payload.position);
        } else {
            const existing = session.players.find((player) => player.position === payload.position);
            if (existing) {
                existing.status = payload.stateName;
            } else {
                session.players.push({
                    name: '',
                    position: payload.position,
                    status: payload.stateName,
                });
                session.players.sort((a, b) => a.position - b.position);
            }
        }
    }

    if (type === 'waiting_watch_change') {
        session.spectators = payload.count ?? 0;
    }

    if (type === 'spectator_state') {
        const snapshot = payload?.snapshot;
        if (snapshot && typeof snapshot === 'object') {
            session.spectatorProtocol = {
                lp: Array.isArray(snapshot.lp) ? snapshot.lp : [null, null],
                turnPlayer: snapshot.turnPlayer ?? null,
                phase: snapshot.phase ?? null,
                catchingUp: Boolean(snapshot.catchingUp),
                watchCount: snapshot.watchCount ?? 0,
                lastEventType: snapshot.lastEventType ?? null,
                messageCount: payload.messageCount ?? null,
                eventCount: payload.eventCount ?? 0,
            };

            const lp0 = Number(snapshot?.lp?.[0]);
            const lp1 = Number(snapshot?.lp?.[1]);
            if (Number.isFinite(lp0) || Number.isFinite(lp1)) {
                session.playerLp = session.playerLp || { 0: null, 1: null };
                if (Number.isFinite(lp0)) session.playerLp[0] = lp0;
                if (Number.isFinite(lp1)) session.playerLp[1] = lp1;
            }

            if (snapshot.turnPlayer !== null && snapshot.turnPlayer !== undefined) {
                session.turnPlayer = Number(snapshot.turnPlayer);
            }

            if (snapshot.phase !== null && snapshot.phase !== undefined) {
                session.phase = normalizeSpectatorPhase(snapshot.phase);
            }

            if (snapshot.watchCount !== null && snapshot.watchCount !== undefined) {
                session.spectators = Number(snapshot.watchCount) || 0;
            }
        }
    }

    if (type === 'spectator_zones') {
        const zones = payload?.zones;
        if (zones && typeof zones === 'object') {
            session.spectatorZones = {
                pileCounts: {
                    deck: {
                        0: zones?.pileCounts?.deck?.[0] ?? null,
                        1: zones?.pileCounts?.deck?.[1] ?? null,
                    },
                },
                graves: {
                    0: Array.isArray(zones?.graves?.[0]) ? zones.graves[0].map((card) => ({ ...card })) : [],
                    1: Array.isArray(zones?.graves?.[1]) ? zones.graves[1].map((card) => ({ ...card })) : [],
                },
                banished: {
                    0: Array.isArray(zones?.banished?.[0]) ? zones.banished[0].map((card) => ({ ...card })) : [],
                    1: Array.isArray(zones?.banished?.[1]) ? zones.banished[1].map((card) => ({ ...card })) : [],
                },
            };

            session.pileCounts = session.pileCounts || { deck: { 0: null, 1: null } };
            session.pileCounts.deck = {
                0: zones?.pileCounts?.deck?.[0] ?? session.pileCounts?.deck?.[0] ?? null,
                1: zones?.pileCounts?.deck?.[1] ?? session.pileCounts?.deck?.[1] ?? null,
            };

            if (zones.graves) {
                session.graves = {
                    0: Array.isArray(zones.graves[0]) ? zones.graves[0].map((card) => ({ ...card })) : session.graves?.[0] || [],
                    1: Array.isArray(zones.graves[1]) ? zones.graves[1].map((card) => ({ ...card })) : session.graves?.[1] || [],
                };
                session.graveSnapshots = {
                    0: session.graves[0].map((card) => ({
                        code: card.code ?? null,
                        sequence: card.sequence,
                        position: card.position ?? null,
                    })),
                    1: session.graves[1].map((card) => ({
                        code: card.code ?? null,
                        sequence: card.sequence,
                        position: card.position ?? null,
                    })),
                };
            }

            if (zones.banished) {
                session.banished = {
                    0: Array.isArray(zones.banished[0]) ? zones.banished[0].map((card) => ({ ...card })) : session.banished?.[0] || [],
                    1: Array.isArray(zones.banished[1]) ? zones.banished[1].map((card) => ({ ...card })) : session.banished?.[1] || [],
                };
                session.banishedSnapshots = {
                    0: session.banished[0].map((card) => ({
                        code: card.code ?? null,
                        sequence: card.sequence,
                        position: card.position ?? null,
                    })),
                    1: session.banished[1].map((card) => ({
                        code: card.code ?? null,
                        sequence: card.sequence,
                        position: card.position ?? null,
                    })),
                };
            }
        }
    }

    if (type === 'reload_field') {
        session.phase = 'dueling';
        if (payload?.lp && typeof payload.lp === 'object') {
            const lp0 = Number(payload.lp[0]);
            const lp1 = Number(payload.lp[1]);
            const hasPositiveLp = (Number.isFinite(lp0) && lp0 > 0) || (Number.isFinite(lp1) && lp1 > 0);
            session.lp = {
                0: hasPositiveLp && Number.isFinite(lp0) ? lp0 : null,
                1: hasPositiveLp && Number.isFinite(lp1) ? lp1 : null,
            };
            if (hasPositiveLp) {
                session.playerLp = { ...session.lp };
            }
        }

        if (payload?.counts && typeof payload.counts === 'object') {
            session.pileCounts = {
                deck: {
                    0: Number(payload.counts?.deck?.[0] ?? null),
                    1: Number(payload.counts?.deck?.[1] ?? null),
                },
                hand: {
                    0: Number(payload.counts?.hand?.[0] ?? null),
                    1: Number(payload.counts?.hand?.[1] ?? null),
                },
                grave: {
                    0: Number(payload.counts?.grave?.[0] ?? null),
                    1: Number(payload.counts?.grave?.[1] ?? null),
                },
            };
        }

        session.field = {};
        session.hands = { 0: [], 1: [] };
        session.graves = { 0: [], 1: [] };
        session.banished = { 0: [], 1: [] };
        session.pendingReveal = null;

        const handCounts = payload?.counts?.hand || {};
        [0, 1].forEach((player) => {
            const count = Math.max(0, Math.min(MAX_VISIBLE_HAND_CARDS, Number(handCounts[player] || 0)));
            session.hands[String(player)] = createHiddenCards(count);
        });

        const graveCounts = payload?.counts?.grave || {};
        [0, 1].forEach((player) => {
            const count = Math.max(0, Number(graveCounts[player] || 0));
            session.graves[String(player)] = Array.from({ length: count }, (_, index) => ({
                code: null,
                position: null,
                sequence: index,
            }));
        });

        session.handSnapshots = {
            0: { count: (session.hands[0] || []).length },
            1: { count: (session.hands[1] || []).length },
        };

        session.graveSnapshots = {
            0: session.graves[0].map((card) => ({
                code: card.code ?? null,
                sequence: card.sequence,
                position: card.position ?? null,
            })),
            1: session.graves[1].map((card) => ({
                code: card.code ?? null,
                sequence: card.sequence,
                position: card.position ?? null,
            })),
        };

        session.banishedSnapshots = { 0: [], 1: [] };

        const zones = Array.isArray(payload?.zones) ? payload.zones : [];
        zones.forEach((zone) => {
            applyFieldCard(
                session,
                zone.controller,
                zone.location,
                zone.sequence,
                null,
                zone.position,
            );
        });
    }

    if (type === 'rps_result') {
        session.rps = payload;
    }

    if (type === 'game_msg' && payload.type === 'MSG_DRAW' && payload.player !== null) {
        const playerKey = String(payload.player);
        const current = Array.isArray(session.hands[playerKey]) ? session.hands[playerKey] : [];
        const parsedCards = Array.isArray(payload.cards)
            ? payload.cards
                .map((card) => normalizeCardCode(card?.code) ?? `hidden-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)
            : [];
        const declaredCount = Math.max(0, Number(payload.count ?? 0));
        const missingCards = Math.max(0, declaredCount - parsedCards.length);
        const drawnCards = [
            ...parsedCards,
            ...createHiddenCards(missingCards),
        ];
        session.hands[playerKey] = [...current, ...drawnCards];
        if (session.pileCounts?.hand) {
            session.pileCounts.hand[playerKey] = (session.pileCounts.hand[playerKey] ?? 0) + declaredCount;
        }
        if (session.pileCounts?.deck) {
            session.pileCounts.deck[playerKey] = Math.max(0, Number(session.pileCounts.deck[playerKey] ?? 0) - declaredCount);
        }
    }

    if (type === 'game_msg' && payload.type === 'MSG_SHUFFLE_HAND' && payload.player !== null) {
        const playerKey = String(payload.player);
        const current = Array.isArray(session.hands[playerKey]) ? [...session.hands[playerKey]] : [];
        for (let index = current.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [current[index], current[randomIndex]] = [current[randomIndex], current[index]];
        }
        session.hands[playerKey] = current;
    }

    if (type === 'game_msg' && payload.type === 'MSG_MOVE') {
        const prevLocation = normalizeLocation(payload.previousLocation);
        const currLocation = normalizeLocation(payload.currentLocation);
        const prevController = payload.previousController;
        const currController = payload.currentController;
        const code = normalizeCardCode(payload.code);
        const prevSequence = payload.previousSequence;
        const currSequence = payload.currentSequence;
        const currPosition = payload.currentPosition;

        if (prevLocation === 0x02 && code !== null && code !== undefined) {
            session.pendingReveal = {
                code,
                controller: currController,
                location: currLocation,
                sequence: currSequence,
                position: currPosition,
            };
        }

        if (prevLocation === 0x02 && prevController !== null) {
            const playerKey = String(prevController);
            session.hands[playerKey] = removeLastCard(session.hands[playerKey] || []);
            if (session.pileCounts?.hand) {
                session.pileCounts.hand[playerKey] = Math.max(0, Number(session.pileCounts.hand[playerKey] ?? 0) - 1);
            }
        }

        if (currLocation === 0x02 && currController !== null && prevLocation !== 0x01) {
            const playerKey = String(currController);
            session.hands[playerKey] = [...(session.hands[playerKey] || []), ...createHiddenCards(1)];
        }

        // Limpiar de snapshots de zona origen
        if (prevLocation === 0x10) {
            const playerKey = String(prevController);
            session.graveSnapshots[playerKey] = (session.graveSnapshots[playerKey] || []).filter(
                (card) => Number(card.sequence) !== Number(prevSequence)
            );
        } else if (prevLocation === 0x20) {
            const playerKey = String(prevController);
            session.banishedSnapshots[playerKey] = (session.banishedSnapshots[playerKey] || []).filter(
                (card) => Number(card.sequence) !== Number(prevSequence)
            );
        }

        const prevFieldCandidates = getFieldKeyCandidates(prevController, prevLocation, prevSequence);
        const prevFieldKey = prevFieldCandidates.find((key) => {
            const candidate = session.field[key];
            if (!candidate) return false;
            if (code === null || code === undefined) return true;
            return normalizeCardCode(candidate.code) === code;
        }) || prevFieldCandidates.find((key) => !!session.field[key]) || null;
        const previousFieldCard = prevFieldKey ? session.field[prevFieldKey] || null : null;
        if (prevFieldKey) {
            delete session.field[prevFieldKey];
        } else if (currLocation === 0x10) {
            removeFallbackFieldCardFromMove(session, payload, code);
        }

        const currFieldKey = getFieldCellKey(currController, currLocation, currSequence);
        if ((currLocation === 0x10) && currController !== null) {
            const resolvedCode = code ?? previousFieldCard?.code ?? null;
            const grave = Array.isArray(session.graves[String(currController)]) ? [...session.graves[String(currController)]] : [];
            const existingIndex = grave.findIndex((item) => Number(item.sequence) === Number(currSequence));
            const graveEntry = {
                code: resolvedCode ?? (existingIndex >= 0 ? grave[existingIndex]?.code ?? null : null),
                position: currPosition,
                sequence: currSequence,
            };
            if (existingIndex >= 0) {
                grave[existingIndex] = { ...grave[existingIndex], ...graveEntry };
            } else {
                grave.push(graveEntry);
            }
            session.graves[String(currController)] = grave;
            // Sincronizar graveSnapshots
            session.graveSnapshots[String(currController)] = grave.map((card) => ({
                code: card.code ?? null,
                sequence: card.sequence,
                position: card.position ?? null,
            }));
            if (session.pileCounts?.grave) {
                session.pileCounts.grave[String(currController)] = Math.max(
                    Number(session.pileCounts.grave[String(currController)] ?? 0),
                    grave.length
                );
            }
        } else if ((currLocation === 0x20) && currController !== null) {
            const resolvedCode = code ?? previousFieldCard?.code ?? null;
            const banished = Array.isArray(session.banished[String(currController)]) ? [...session.banished[String(currController)]] : [];
            const existingIndex = banished.findIndex((item) => Number(item.sequence) === Number(currSequence));
            const banishedEntry = {
                code: resolvedCode ?? (existingIndex >= 0 ? banished[existingIndex]?.code ?? null : null),
                position: currPosition,
                sequence: currSequence,
            };
            if (existingIndex >= 0) {
                banished[existingIndex] = { ...banished[existingIndex], ...banishedEntry };
            } else {
                banished.push(banishedEntry);
            }
            session.banished[String(currController)] = banished;
            // Sincronizar banishedSnapshots
            session.banishedSnapshots[String(currController)] = banished.map((card) => ({
                code: card.code ?? null,
                sequence: card.sequence,
                position: card.position ?? null,
            }));
        } else if (currFieldKey) {
            session.field[currFieldKey] = {
                ...(session.field[currFieldKey] || {}),
                code: code ?? session.field[currFieldKey]?.code ?? null,
                controller: currController,
                location: normalizeLocation(currLocation),
                sequence: currSequence,
                position: currPosition,
            };
        }
    }

    if (type === 'game_msg' && payload.type === 'MSG_UPDATE_CARD') {
        const normalizedPayloadLocation = normalizeLocation(payload.location);
        const zoneSnapshotKey = getZoneSnapshotKey(payload.player, normalizedPayloadLocation);
        const previousZoneSnapshot = session.fieldUpdateSnapshots[zoneSnapshotKey] || {};
        const nextEntrySnapshot = getCardSnapshotValue({
            code: normalizeCardCode(payload.code) ?? session.pendingReveal?.code ?? null,
            controller: payload.player,
            location: normalizedPayloadLocation,
            sequence: payload.sequence,
            position: payload.position,
            flags: payload.flags ?? null,
        });
        const previousEntrySnapshot = previousZoneSnapshot[String(payload.sequence)] || null;

        if (!areCardSnapshotsEqual(previousEntrySnapshot, nextEntrySnapshot)) {
            applyFieldCard(
                session,
                payload.player,
                normalizedPayloadLocation,
                payload.sequence,
                normalizeCardCode(payload.code) ?? session.pendingReveal?.code ?? null,
                payload.position,
            );
            session.fieldUpdateSnapshots[zoneSnapshotKey] = {
                ...previousZoneSnapshot,
                [String(payload.sequence)]: nextEntrySnapshot,
            };
        }
        if ((payload.code ?? session.pendingReveal?.code ?? null) !== null) {
            session.pendingReveal = null;
        }
    }

    if (type === 'game_msg' && payload.type === 'MSG_UPDATE_DATA' && Array.isArray(payload.cards)) {
        const normalizedPayloadLocation = normalizeLocation(payload.location);
        const zoneSnapshotKey = getZoneSnapshotKey(payload.player, normalizedPayloadLocation);
        const previousZoneSnapshot = session.fieldUpdateSnapshots[zoneSnapshotKey] || {};
        const nextZoneSnapshot = buildZoneSnapshot(payload.cards, payload.player, normalizedPayloadLocation, session.pendingReveal?.code ?? null);

        if (normalizedPayloadLocation === 0x04 || normalizedPayloadLocation === 0x08) {
            Object.keys(previousZoneSnapshot).forEach((sequenceKey) => {
                if (Object.prototype.hasOwnProperty.call(nextZoneSnapshot, sequenceKey)) {
                    return;
                }
                const fieldKey = getFieldCellKey(payload.player, normalizedPayloadLocation, Number(sequenceKey));
                if (fieldKey) {
                    delete session.field[fieldKey];
                }
            });
        }

        payload.cards.forEach((card) => {
            const fallbackCode = normalizeCardCode(card.code) ?? session.pendingReveal?.code ?? null;
            if (normalizedPayloadLocation === 0x10) {
                const grave = Array.isArray(session.graves[String(payload.player)]) ? [...session.graves[String(payload.player)]] : [];
                const existingIndex = grave.findIndex((item) => Number(item.sequence) === Number(card.sequence));
                const graveEntry = {
                    code: fallbackCode ?? (existingIndex >= 0 ? grave[existingIndex]?.code ?? null : null),
                    position: card.position,
                    sequence: card.sequence,
                };
                if (existingIndex >= 0) {
                    grave[existingIndex] = { ...grave[existingIndex], ...graveEntry };
                } else {
                    grave.push(graveEntry);
                }
                session.graves[String(payload.player)] = grave;
                // Sincronizar graveSnapshots
                session.graveSnapshots[String(payload.player)] = grave.map((card) => ({
                    code: card.code ?? null,
                    sequence: card.sequence,
                    position: card.position ?? null,
                }));
                if (fallbackCode !== null) {
                    session.pendingReveal = null;
                }
            } else if (normalizedPayloadLocation === 0x20) {
                const banished = Array.isArray(session.banished[String(payload.player)]) ? [...session.banished[String(payload.player)]] : [];
                const existingIndex = banished.findIndex((item) => Number(item.sequence) === Number(card.sequence));
                const banishedEntry = {
                    code: fallbackCode ?? (existingIndex >= 0 ? banished[existingIndex]?.code ?? null : null),
                    position: card.position,
                    sequence: card.sequence,
                };
                if (existingIndex >= 0) {
                    banished[existingIndex] = { ...banished[existingIndex], ...banishedEntry };
                } else {
                    banished.push(banishedEntry);
                }
                session.banished[String(payload.player)] = banished;
                // Sincronizar banishedSnapshots
                session.banishedSnapshots[String(payload.player)] = banished.map((card) => ({
                    code: card.code ?? null,
                    sequence: card.sequence,
                    position: card.position ?? null,
                }));
                if (fallbackCode !== null) {
                    session.pendingReveal = null;
                }
            } else {
                const nextEntrySnapshot = nextZoneSnapshot[String(card.sequence)] || null;
                const previousEntrySnapshot = previousZoneSnapshot[String(card.sequence)] || null;
                if (!areCardSnapshotsEqual(previousEntrySnapshot, nextEntrySnapshot)) {
                    applyFieldCard(
                        session,
                        payload.player,
                        normalizedPayloadLocation,
                        card.sequence,
                        fallbackCode,
                        card.position,
                    );
                }
                if (fallbackCode !== null) {
                    session.pendingReveal = null;
                }
            }
        });
        session.fieldUpdateSnapshots[zoneSnapshotKey] = nextZoneSnapshot;
    }

    if (type === 'game_msg' && payload.type === 'MSG_POS_CHANGE') {
        const normalizedLocation = normalizeLocation(payload.location);
        const fieldKey = getFieldCellKey(payload.controller, normalizedLocation, payload.sequence);

        if (fieldKey && session.field[fieldKey]) {
            const previousZoneSnapshot = session.fieldUpdateSnapshots[getZoneSnapshotKey(payload.controller, normalizedLocation)] || {};
            const previousEntrySnapshot = previousZoneSnapshot[String(payload.sequence)] || null;

            const nextEntrySnapshot = getCardSnapshotValue({
                code: normalizeCardCode(payload.code) ?? session.field[fieldKey]?.code ?? null,
                controller: payload.controller,
                location: normalizedLocation,
                sequence: payload.sequence,
                position: payload.currentPosition,
                flags: session.field[fieldKey]?.flags ?? null,
            });

            if (!areCardSnapshotsEqual(previousEntrySnapshot, nextEntrySnapshot)) {
                applyFieldCard(
                    session,
                    payload.controller,
                    normalizedLocation,
                    payload.sequence,
                    normalizeCardCode(payload.code) ?? session.field[fieldKey]?.code ?? null,
                    payload.currentPosition,
                );

                const zoneSnapshotKey = getZoneSnapshotKey(payload.controller, normalizedLocation);
                session.fieldUpdateSnapshots[zoneSnapshotKey] = {
                    ...previousZoneSnapshot,
                    [String(payload.sequence)]: nextEntrySnapshot,
                };
            }
        }
    }

    if (type === 'duel_start') {
        session.phase = 'dueling';
        session.startingPlayer = null;
        session.turnCount = 0;
        session.fieldUpdateSnapshots = {};
    }

    if (type === 'duel_end') {
        session.phase = 'ended';
        scheduleSessionCleanup(uniqueId, 120_000);
    }

    if (type === 'game_msg') {
        if (payload.type === 'MSG_NEW_TURN') {
            if (session.startingPlayer === null || session.startingPlayer === undefined) {
                const seededStartingPlayer = getStartingPlayerFromTypeChange(session.typeChange);
                session.startingPlayer = seededStartingPlayer ?? payload.player ?? null;
            }
            session.turnCount = (session.turnCount ?? 0) + 1;
            session.turnPlayer = getTurnPlayerFromSeed(session.startingPlayer, session.turnCount);
        }
        if (payload.type === 'MSG_NEW_PHASE') {
            session.phase = `phase:${payload.phase}`;
        }
    }

    if (type === 'time_limit' && payload.player !== null && payload.player !== undefined) {
        session.playerTimes[String(payload.player)] = payload.timeLeft ?? session.playerTimes[String(payload.player)] ?? null;
        session.playerTimeUpdatedAt[String(payload.player)] = Date.now();
    }

    if (type === 'game_msg' && payload.type === 'MSG_START') {
        if (payload.playerType !== null && payload.playerType !== undefined) {
            session.typeChange = payload.playerType;
            const seededStartingPlayer = getStartingPlayerFromTypeChange(session.typeChange);
            if (seededStartingPlayer !== null) {
                session.startingPlayer = seededStartingPlayer;
                session.turnPlayer = getTurnPlayerFromSeed(session.startingPlayer, session.turnCount);
            }
        }
        session.playerLp = session.playerLp || { 0: null, 1: null };
        const lp0 = Number(payload.lp0);
        const lp1 = Number(payload.lp1);
        if (Number.isFinite(lp0) && lp0 > 0) session.playerLp['0'] = lp0;
        if (Number.isFinite(lp1) && lp1 > 0) session.playerLp['1'] = lp1;
    }

    if (type === 'game_msg' && payload.player !== null && payload.player !== undefined) {
        const mappedPlayer = mapProtocolPlayerByFlow(payload.player, session.clientFlow);
        const playerKey = String(mappedPlayer);
        session.playerLp = session.playerLp || { 0: null, 1: null };
        if (payload.type === 'MSG_DAMAGE' && payload.amount !== null && payload.amount !== undefined) {
            const current = Number(session.playerLp[playerKey]);
            const base = Number.isFinite(current) ? current : getFallbackLp(session, playerKey);
            session.playerLp[playerKey] = Math.max(0, base - Number(payload.amount));
        }
        if (payload.type === 'MSG_RECOVER' && payload.amount !== null && payload.amount !== undefined) {
            const current = Number(session.playerLp[playerKey]);
            const base = Number.isFinite(current) ? current : getFallbackLp(session, playerKey);
            session.playerLp[playerKey] = Math.max(0, base + Number(payload.amount));
        }
        if (payload.type === 'MSG_LPUPDATE' && payload.lp !== null && payload.lp !== undefined) {
            const lp = Number(payload.lp);
            if (Number.isFinite(lp) && lp >= 0) {
                session.playerLp[playerKey] = lp;
            }
        }
        if (payload.type === 'MSG_PAY_LPCOST') {
            const rawCost = payload.amount ?? payload.cost;
            if (rawCost !== null && rawCost !== undefined) {
                const current = Number(session.playerLp[playerKey]);
                const base = Number.isFinite(current) ? current : getFallbackLp(session, playerKey);
                session.playerLp[playerKey] = Math.max(0, base - Number(rawCost));
            }
        }
    }

    if (type === 'connection_end' || type === 'connection_error') {
        scheduleSessionCleanup(uniqueId, 30_000);
    }

    addEventToSession(session, type, payload);
}

function registerEventsRoute(app) {
    app.get('/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        res.write(`data: ${JSON.stringify({ message: 'connected' })}\n\n`);
        clients.add(res);

        req.on('close', () => {
            clients.delete(res);
        });
    });
}

function getSession(uniqueId) {
    return sessions.get(uniqueId) ?? null;
}

function getSessionPayload(uniqueId, options = {}) {
    const session = sessions.get(uniqueId);
    if (!session) {
        return null;
    }

    const edoproSession = isEdoproSession(session);
    const includeReplay = options.includeReplay !== false;
    const includeTransport = options.includeTransport === true;
    const consumeReplay = options.consumeReplay === true;
    const payload = {
        ...session,
        clientFlow: normalizeClientFlow(session.clientFlow, 'edopro'),
        spectatorProtocol: session.spectatorProtocol ? { ...session.spectatorProtocol } : null,
        spectatorZones: session.spectatorZones ? {
            pileCounts: {
                deck: {
                    0: session.spectatorZones?.pileCounts?.deck?.[0] ?? null,
                    1: session.spectatorZones?.pileCounts?.deck?.[1] ?? null,
                },
            },
            graves: {
                0: Array.isArray(session.spectatorZones?.graves?.[0]) ? session.spectatorZones.graves[0].map((card) => ({ ...card })) : [],
                1: Array.isArray(session.spectatorZones?.graves?.[1]) ? session.spectatorZones.graves[1].map((card) => ({ ...card })) : [],
            },
            banished: {
                0: Array.isArray(session.spectatorZones?.banished?.[0]) ? session.spectatorZones.banished[0].map((card) => ({ ...card })) : [],
                1: Array.isArray(session.spectatorZones?.banished?.[1]) ? session.spectatorZones.banished[1].map((card) => ({ ...card })) : [],
            },
        } : null,
        lastEvents: Array.isArray(session.lastEvents) ? [...session.lastEvents] : [],
        replayEvents: includeReplay && Array.isArray(session.replayEvents) ? [...session.replayEvents] : [],
        transportEvents: includeTransport && Array.isArray(session.transportEvents) ? [...session.transportEvents] : [],
    };

    if (consumeReplay) {
        session.replayEvents = [];
    }

    return payload;
}

function deleteSession(uniqueId) {
    if (!uniqueId) {
        return false;
    }
    clearSessionCleanup(uniqueId);
    return sessions.delete(uniqueId);
}

function seedSession(uniqueId, room) {
    const session = ensureSession(uniqueId);
    if (!session) return;
    if (room) {
        session.room = room;
        session.clientFlow = normalizeClientFlow(room.roomClient, session.clientFlow);
        if (Array.isArray(room.users) && room.users.length > 0) {
            session.players = room.users.map((user) => ({
                name: user.name,
                position: user.pos,
                status: 'NOT_READY',
            }));
        }
    }
}

function setSessionMode(uniqueId, mode) {
    const session = ensureSession(uniqueId);
    if (!session) return;
    session.mode = mode;
}

function setSessionFlow(uniqueId, clientFlow) {
    const session = ensureSession(uniqueId);
    if (!session) return;
    session.clientFlow = normalizeClientFlow(clientFlow, session.clientFlow);
}

function touchSessionViewer(uniqueId, timestamp = Date.now()) {
    const session = ensureSession(uniqueId);
    if (!session) {
        return null;
    }
    session.lastViewerPingAt = Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now();
    return session.lastViewerPingAt;
}

function listSessionIds() {
    return Array.from(sessions.keys());
}

function broadcast(message, uniqueId) {
    const payload = `data: ${JSON.stringify({ message, uniqueId })}\n\n`;
    clients.forEach((client) => {
        client.write(payload);
    });
}

function broadcastEvent(type, uniqueId, payload = {}) {
    updateSession(uniqueId, type, payload);

    const message = `data: ${JSON.stringify({
        message: type,
        uniqueId,
        payload,
    })}\n\n`;

    clients.forEach((client) => {
        client.write(message);
    });
}

module.exports = { broadcast, broadcastEvent, registerEventsRoute, getSession, getSessionPayload, seedSession, setSessionMode, setSessionFlow, deleteSession, touchSessionViewer, listSessionIds };
module.exports._test = {
    getFieldCellKey,
    getFieldSlotByController,
    normalizeLocation,
};
