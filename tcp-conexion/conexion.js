const net = require('net');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const { processStreamBuffer } = require('../tcp-conexion/validate');
const messageHandlers = require('../messageshandler/messageHandlers');
const { broadcast, broadcastEvent } = require('./websocket');
const { createTraceLogger } = require('./message-trace');
const COMMON_MSG = require('../messages/COMMON_MSG.JS');

let MultiroleSpectatorDecoder = null;
let SpectatorState = null;
try {
    ({ MultiroleSpectatorDecoder, SpectatorState } = require('multirole-spectator-protocol'));
} catch (_) {
    try {
        ({ MultiroleSpectatorDecoder, SpectatorState } = require('../multirole-spectator-protocol/dist'));
    } catch (_) {
        MultiroleSpectatorDecoder = null;
        SpectatorState = null;
    }
}

const activeConnections = new Map();
// SUCCESS REFERENCE (ROOM PASSWORD GATE):
// - JOINERROR must block opening.
// - If no JOINERROR arrives, timeout fallback can open for server variants.
// - Handshake success packets are limited to explicit lobby/join STOC types.
const HANDSHAKE_SUCCESS_STOC_TYPES = new Set([
    0x12, // STOC_JOIN_GAME
    0x20, // STOC_HS_PLAYER_ENTER
    0x21, // STOC_HS_PLAYER_CHANGE
    0x22, // STOC_HS_WATCH_CHANGE
]);

const MAX_PENDING_BUFFER_BYTES = 1024 * 1024; // 1MB guardrail for malformed TCP streams

function normalizeSpectatorSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return null;
    }

    const lp0 = Number(snapshot?.lp?.[0]);
    const lp1 = Number(snapshot?.lp?.[1]);
    const turnPlayer = Number(snapshot?.turnPlayer);
    const phase = Number(snapshot?.phase);
    const watchCount = Number(snapshot?.watchCount);

    return {
        lp: [
            Number.isFinite(lp0) ? lp0 : null,
            Number.isFinite(lp1) ? lp1 : null,
        ],
        turnPlayer: Number.isFinite(turnPlayer) ? turnPlayer : null,
        phase: Number.isFinite(phase) ? phase : null,
        catchingUp: Boolean(snapshot.catchingUp),
        watchCount: Number.isFinite(watchCount) ? watchCount : 0,
        lastEventType: snapshot?.lastEvent?.type || null,
    };
}

function createSpectatorZoneTracker() {
    return {
        pileCounts: {
            deck: { 0: null, 1: null },
        },
        graves: { 0: [], 1: [] },
        banished: { 0: [], 1: [] },
    };
}

function cloneSpectatorZoneTracker(tracker) {
    return {
        pileCounts: {
            deck: {
                0: tracker?.pileCounts?.deck?.[0] ?? null,
                1: tracker?.pileCounts?.deck?.[1] ?? null,
            },
        },
        graves: {
            0: Array.isArray(tracker?.graves?.[0]) ? tracker.graves[0].map((card) => ({ ...card })) : [],
            1: Array.isArray(tracker?.graves?.[1]) ? tracker.graves[1].map((card) => ({ ...card })) : [],
        },
        banished: {
            0: Array.isArray(tracker?.banished?.[0]) ? tracker.banished[0].map((card) => ({ ...card })) : [],
            1: Array.isArray(tracker?.banished?.[1]) ? tracker.banished[1].map((card) => ({ ...card })) : [],
        },
    };
}

function readUInt32LESafe(buffer, offset) {
    if (!Buffer.isBuffer(buffer) || offset < 0 || offset + 4 > buffer.length) {
        return null;
    }
    return buffer.readUInt32LE(offset);
}

function parseSpectatorQueryBuffer(buffer, startOffset = 0) {
    const result = {
        flags: 0,
        code: null,
        position: null,
        bytesRead: 0,
        truncated: false,
        noProgress: false,
    };

    if (!Buffer.isBuffer(buffer) || startOffset < 0 || startOffset >= buffer.length) {
        return result;
    }

    let offset = startOffset;
    while (offset + 2 <= buffer.length) {
        const blockStart = offset;
        const size = buffer.readUInt16LE(offset);
        offset += 2;

        if (size === 0) {
            break;
        }

        if (offset + 4 > buffer.length) {
            result.truncated = true;
            break;
        }

        const flag = buffer.readUInt32LE(offset);
        offset += 4;
        const payloadSize = Math.max(0, size - 4);
        if (offset + payloadSize > buffer.length) {
            result.truncated = true;
            break;
        }

        const payloadOffset = offset;
        result.flags |= flag;

        if (flag === COMMON_MSG.QUERY_CODE) {
            result.code = readUInt32LESafe(buffer, payloadOffset);
        }

        if (flag === COMMON_MSG.QUERY_POSITION) {
            result.position = readUInt32LESafe(buffer, payloadOffset);
        }

        offset += payloadSize;
        if (offset <= blockStart) {
            result.noProgress = true;
            break;
        }
    }

    result.bytesRead = Math.max(0, offset - startOffset);
    return result;
}

function parseSpectatorUpdateData(queryBuffer) {
    if (!Buffer.isBuffer(queryBuffer) || queryBuffer.length < 4) {
        return [];
    }

    const totalSize = queryBuffer.readUInt32LE(0);
    const cards = [];
    let offset = 4;
    let sequence = 0;
    const bytesBudget = Math.min(Number(totalSize || 0), Math.max(0, queryBuffer.length - 4));
    const budgetEnd = offset + bytesBudget;

    while (offset < budgetEnd && offset + 2 <= queryBuffer.length) {
        const query = parseSpectatorQueryBuffer(queryBuffer, offset);
        if (query.bytesRead <= 0 || query.noProgress) {
            break;
        }

        cards.push({
            sequence,
            code: query.code,
            position: query.position,
            flags: query.flags,
        });
        sequence += 1;
        offset += query.bytesRead;

        if (query.truncated) {
            break;
        }
    }

    return cards;
}

function parseSpectatorUpdateCard(queryBuffer, sequence) {
    const query = parseSpectatorQueryBuffer(queryBuffer, 0);
    return {
        sequence,
        code: query.code,
        position: query.position,
        flags: query.flags,
    };
}

function upsertCardBySequence(cards, nextCard) {
    const list = Array.isArray(cards) ? [...cards] : [];
    const nextSequence = Number(nextCard?.sequence);
    if (!Number.isFinite(nextSequence)) {
        return list;
    }

    const index = list.findIndex((card) => Number(card?.sequence) === nextSequence);
    const normalizedCard = {
        code: nextCard?.code ?? (index >= 0 ? list[index]?.code ?? null : null),
        position: nextCard?.position ?? (index >= 0 ? list[index]?.position ?? null : null),
        sequence: nextSequence,
    };

    if (index >= 0) {
        list[index] = { ...list[index], ...normalizedCard };
    } else {
        list.push(normalizedCard);
        list.sort((left, right) => Number(left.sequence) - Number(right.sequence));
    }

    return list;
}

function removeCardBySequence(cards, sequence) {
    if (!Array.isArray(cards)) {
        return [];
    }
    return cards.filter((card) => Number(card?.sequence) !== Number(sequence));
}

function applySpectatorEventToZones(tracker, event) {
    if (!tracker || !event || typeof event !== 'object') {
        return false;
    }

    let changed = false;

    if (event.type === 'MSG_START') {
        tracker.pileCounts.deck[0] = Number.isFinite(Number(event.deckP0)) ? Number(event.deckP0) : tracker.pileCounts.deck[0];
        tracker.pileCounts.deck[1] = Number.isFinite(Number(event.deckP1)) ? Number(event.deckP1) : tracker.pileCounts.deck[1];
        tracker.graves = { 0: [], 1: [] };
        tracker.banished = { 0: [], 1: [] };
        changed = true;
    }

    if (event.type === 'MSG_DRAW') {
        const player = Number(event.player);
        const count = Math.max(0, Number(event.count || 0));
        if ((player === 0 || player === 1) && Number.isFinite(Number(tracker.pileCounts.deck[player]))) {
            tracker.pileCounts.deck[player] = Math.max(0, Number(tracker.pileCounts.deck[player]) - count);
            changed = true;
        }
    }

    if (event.type === 'MSG_MOVE') {
        const from = event.from || {};
        const to = event.to || {};
        const fromController = Number(from.controller);
        const toController = Number(to.controller);
        const fromLocation = Number(from.location);
        const toLocation = Number(to.location);

        if ((fromController === 0 || fromController === 1) && fromLocation === COMMON_MSG.LOCATION_DECK && toLocation !== COMMON_MSG.LOCATION_DECK) {
            if (Number.isFinite(Number(tracker.pileCounts.deck[fromController]))) {
                tracker.pileCounts.deck[fromController] = Math.max(0, Number(tracker.pileCounts.deck[fromController]) - 1);
                changed = true;
            }
        }

        if ((toController === 0 || toController === 1) && toLocation === COMMON_MSG.LOCATION_DECK && fromLocation !== COMMON_MSG.LOCATION_DECK) {
            if (Number.isFinite(Number(tracker.pileCounts.deck[toController]))) {
                tracker.pileCounts.deck[toController] = Math.max(0, Number(tracker.pileCounts.deck[toController]) + 1);
                changed = true;
            }
        }

        if (fromController === 0 || fromController === 1) {
            if (fromLocation === COMMON_MSG.LOCATION_GRAVE) {
                tracker.graves[fromController] = removeCardBySequence(tracker.graves[fromController], from.sequence);
                changed = true;
            }
            if (fromLocation === COMMON_MSG.LOCATION_REMOVED) {
                tracker.banished[fromController] = removeCardBySequence(tracker.banished[fromController], from.sequence);
                changed = true;
            }
        }

        if (toController === 0 || toController === 1) {
            if (toLocation === COMMON_MSG.LOCATION_GRAVE) {
                tracker.graves[toController] = upsertCardBySequence(tracker.graves[toController], {
                    code: event.code ?? null,
                    position: to.position ?? null,
                    sequence: to.sequence,
                });
                changed = true;
            }
            if (toLocation === COMMON_MSG.LOCATION_REMOVED) {
                tracker.banished[toController] = upsertCardBySequence(tracker.banished[toController], {
                    code: event.code ?? null,
                    position: to.position ?? null,
                    sequence: to.sequence,
                });
                changed = true;
            }
        }
    }

    if (event.type === 'MSG_UPDATE_DATA') {
        const player = Number(event.player);
        const location = Number(event.location);
        const cards = parseSpectatorUpdateData(event.queryBuffer);
        if (player === 0 || player === 1) {
            if (location === COMMON_MSG.LOCATION_GRAVE) {
                tracker.graves[player] = cards.map((card) => ({
                    code: card.code ?? null,
                    position: card.position ?? null,
                    sequence: Number(card.sequence),
                }));
                changed = true;
            }
            if (location === COMMON_MSG.LOCATION_REMOVED) {
                tracker.banished[player] = cards.map((card) => ({
                    code: card.code ?? null,
                    position: card.position ?? null,
                    sequence: Number(card.sequence),
                }));
                changed = true;
            }
        }
    }

    if (event.type === 'MSG_UPDATE_CARD') {
        const player = Number(event.controller);
        const location = Number(event.location);
        const card = parseSpectatorUpdateCard(event.queryBuffer, event.sequence);
        if (player === 0 || player === 1) {
            if (location === COMMON_MSG.LOCATION_GRAVE) {
                tracker.graves[player] = upsertCardBySequence(tracker.graves[player], card);
                changed = true;
            }
            if (location === COMMON_MSG.LOCATION_REMOVED) {
                tracker.banished[player] = upsertCardBySequence(tracker.banished[player], card);
                changed = true;
            }
        }
    }

    return changed;
}

function normalizeClientFlow(explicitFlow, roomMeta) {
    const requested = String(explicitFlow || '').trim().toLowerCase();
    if (requested === 'edopro' || requested === 'mercury') {
        return requested;
    }

    const roomClient = String(roomMeta?.roomClient || '').trim().toLowerCase();
    if (roomClient === 'edopro' || roomClient === 'mercury') {
        return roomClient;
    }

    return String(roomMeta?.roomname || '').trim() ? 'mercury' : 'edopro';
}

function toSizedPacket(command, payloadBuffer) {
    const data = Buffer.concat([Buffer.from([command]), payloadBuffer]);
    const packet = Buffer.alloc(2 + data.length);
    packet.writeUInt16LE(data.length, 0);
    data.copy(packet, 2);
    return packet;
}

function utf16FixedBuffer(text, bytesLength) {
    const buffer = Buffer.alloc(bytesLength);
    Buffer.from(String(text || ''), 'utf16le').copy(buffer, 0, 0, bytesLength);
    return buffer;
}

function buildPlayerInfoPacket(name = 'WebsiteView') {
    return toSizedPacket(0x10, utf16FixedBuffer(name, 40));
}

function buildJoinGamePacket(roomId, roomPassword = '') {
    // This must stay byte-for-byte compatible with the original visor blob:
    // 2 bytes version2 + 2 bytes padding + 4 bytes room id + 40 bytes password + 4 bytes client version
    const payload = Buffer.alloc(52);

    payload.writeUInt16LE(0x1354, 0); // version2 seen in the original viewer blob
    payload.writeUInt16LE(0, 2);
    payload.writeUInt32LE(Number(roomId), 4);
    utf16FixedBuffer(roomPassword, 40).copy(payload, 8);
    payload.writeUInt32LE(0x000a0128, 48); // client version from the original viewer blob

    return toSizedPacket(0x12, payload);
}

function openViewer(uniqueId, roomMeta = null, openMode = 'viewer', viewerBaseUrlOverride = '') {
    const viewerBaseUrl = (viewerBaseUrlOverride || process.env.VIEWER_BASE_URL || 'http://localhost:8088').replace(/\/$/, '');
    if (openMode === 'debug') {
        const url = `${viewerBaseUrl}/raw-viewer.html?id=${uniqueId}`;

        if (process.platform === 'win32') {
            const child = spawn('cmd', ['/c', 'start', '', url], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true,
            });
            child.unref();
            return;
        }

        if (process.platform === 'darwin') {
            const child = spawn('open', [url], {
                detached: true,
                stdio: 'ignore',
            });
            child.unref();
            return;
        }

        const child = spawn('xdg-open', [url], {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();
        return;
    }

    const roomClient = String(roomMeta?.roomClient || '').toLowerCase();
    const istart = String(roomMeta?.istart || '').toLowerCase();
    const initialView = istart === 'waiting' || (!istart && roomClient === 'mercury') ? 'waiting' : 'duel';
    const url = `${viewerBaseUrl}/viewer.html?id=${uniqueId}&view=${initialView}`;

    if (process.platform === 'win32') {
        const child = spawn('cmd', ['/c', 'start', '', url], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
        });
        child.unref();
        return;
    }

    if (process.platform === 'darwin') {
        const child = spawn('open', [url], {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();
        return;
    }

    const child = spawn('xdg-open', [url], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
}

function hexadecimalALittleEndian(hexadecimal) {
    const bytes = [];
    for (let i = 0; i < hexadecimal.length; i += 2) {
        bytes.unshift(hexadecimal.substr(i, 2));
    }

    let littleEndian = bytes.join('');
    if (littleEndian.length < 4) {
        littleEndian = littleEndian.padStart(4, '0');
    }

    return littleEndian;
}

function parseStocErrorSegment(segment) {
    const buffer = Buffer.isBuffer(segment) ? segment : Buffer.from(segment || '', 'hex');
    if (!buffer || buffer.length < 4) {
        return null;
    }

    const errorType = buffer.readUInt8(3);
    const errorCode = buffer.length >= 8 ? buffer.readUInt32LE(4) : null;

    const errorTypeName = (() => {
        switch (errorType) {
            case 0x01: return 'JOINERROR';
            case 0x02: return 'DECKERROR';
            case 0x03: return 'SIDEERROR';
            case 0x04: return 'VERERROR';
            case 0x05: return 'VERERROR2';
            default: return 'UNKNOWN';
        }
    })();

    const joinErrorName = errorType === 0x01 ? (() => {
        switch (Number(errorCode)) {
            case 0: return 'JERR_UNABLE';
            case 1: return 'JERR_PASSWORD';
            case 2: return 'JERR_REFUSED';
            default: return 'UNKNOWN';
        }
    })() : null;

    let errorKey = 'STOC_ERROR_UNKNOWN';
    let message = 'Server rejected the request.';

    if (errorType === 0x01 && joinErrorName === 'JERR_PASSWORD') {
        errorKey = 'ROOM_PASSWORD_INVALID';
        message = 'Wrong room password.';
    } else if (errorType === 0x01 && joinErrorName === 'JERR_REFUSED') {
        errorKey = 'ROOM_JOIN_REFUSED';
        message = 'Join request refused by host.';
    } else if (errorType === 0x01 && joinErrorName === 'JERR_UNABLE') {
        errorKey = 'ROOM_JOIN_UNABLE';
        message = 'Unable to join this room.';
    }

    return {
        errorType,
        errorTypeName,
        errorCode,
        joinErrorName,
        errorKey,
        message,
    };
}

function establecer_conexion(id_room, uniqueId, roomMeta = null, connectionOptions = {}) {
    const server_host = connectionOptions.serverHost || process.env.DUEL_SERVER_HOST || 'us.projectignis.org';
    const server_port = Number(connectionOptions.serverPort || process.env.DUEL_SERVER_PORT || 7911);
    const shouldSwitchToSpectator = connectionOptions.asSpectator !== false;
    const id_sin_espacios = String(id_room).replace(/\s/g, '');
    const id_decimal = parseInt(id_sin_espacios, 10);
    const openMode = connectionOptions.openMode || 'viewer';
    const playerInfoPacket = buildPlayerInfoPacket(connectionOptions.playerName || 'WebsiteView');
    const joinGamePacket = buildJoinGamePacket(id_decimal, connectionOptions.roomPassword || '');
    const create_room_hex = Buffer.concat([playerInfoPacket, joinGamePacket]).toString('hex');
    const debugMode = openMode === 'debug' || process.env.VISOR_DEBUG_TCP === '1';
    const clientFlow = normalizeClientFlow(connectionOptions.clientFlow, roomMeta);
    const shouldAutoOpenViewer = connectionOptions.autoOpenViewer !== false;
    const requireHandshakeValidation = connectionOptions.requireHandshakeValidation === true;
    const handshakeTimeoutMs = Number(connectionOptions.handshakeTimeoutMs || 7000);
    const traceLogger = createTraceLogger({
        uniqueId,
        roomId: id_room,
        clientFlow,
        enabled: connectionOptions.traceMessages !== false,
    });

    console.log(`Recibido ID: ${id_decimal}`);
    if (debugMode) {
        console.log(`Recibido ID2: ${create_room_hex}`);
    }

    const client = new net.Socket();
    let messageCount = 0;
    let pendingBuffer = Buffer.alloc(0);
    let spectatorCommandSent = false;
    let viewerOpened = false;
    let handshakeSettled = false;
    let handshakeTimer = null;
    let sawJoinError = false;
    const spectatorDecoder = MultiroleSpectatorDecoder ? new MultiroleSpectatorDecoder() : null;
    const spectatorState = SpectatorState ? new SpectatorState() : null;
    const spectatorZoneTracker = createSpectatorZoneTracker();
    activeConnections.set(uniqueId, client);

    const safeResolveHandshake = (value) => {
        if (handshakeSettled) return;
        handshakeSettled = true;
        if (handshakeTimer) {
            clearTimeout(handshakeTimer);
            handshakeTimer = null;
        }
        if (typeof connectionOptions.onHandshakeSuccess === 'function') {
            try {
                connectionOptions.onHandshakeSuccess(value);
            } catch (_) {
                // ignore callback errors
            }
        }
    };

    const safeRejectHandshake = (value) => {
        if (handshakeSettled) return;
        handshakeSettled = true;
        if (handshakeTimer) {
            clearTimeout(handshakeTimer);
            handshakeTimer = null;
        }
        if (typeof connectionOptions.onHandshakeError === 'function') {
            try {
                connectionOptions.onHandshakeError(value);
            } catch (_) {
                // ignore callback errors
            }
        }
    };

    const openViewerOnce = () => {
        if (viewerOpened || !shouldAutoOpenViewer) {
            return;
        }
        viewerOpened = true;
        openViewer(uniqueId, roomMeta, openMode, connectionOptions.viewerBaseUrl || '');
    };

    client.setKeepAlive(true, 15000);
    client.setNoDelay(true);

    client.connect(server_port, server_host, () => {
        const client_id = randomUUID();
        client.write(playerInfoPacket);
        client.write(joinGamePacket);
        traceLogger.logSend('CTOS player info packet', playerInfoPacket);
        traceLogger.logSend('CTOS join game packet', joinGamePacket);
        console.log(`Conectado al servidor con ID de sesion ${client_id}`);

        broadcastEvent('socket_send', uniqueId, {
            roomId: id_room,
            serverHost: server_host,
            serverPort: server_port,
            hex: playerInfoPacket.toString('hex'),
            description: 'CTOS player info packet',
        });

        broadcastEvent('socket_send', uniqueId, {
            roomId: id_room,
            serverHost: server_host,
            serverPort: server_port,
            hex: joinGamePacket.toString('hex'),
            description: 'CTOS join game packet',
        });

        broadcastEvent('connection_open', uniqueId, {
            roomId: id_room,
            serverHost: server_host,
            serverPort: server_port,
            room: roomMeta,
            mode: openMode,
            clientFlow,
        });
        if (!requireHandshakeValidation) {
            openViewerOnce();
            safeResolveHandshake({
                roomId: id_room,
                clientFlow,
                mode: 'non_blocking',
            });
        } else {
            handshakeTimer = setTimeout(() => {
                if (sawJoinError) {
                    safeRejectHandshake({
                        errorKey: 'ROOM_JOIN_TIMEOUT',
                        error: 'HANDSHAKE_TIMEOUT',
                        message: 'Timeout waiting for server join confirmation.',
                        roomId: id_room,
                        clientFlow,
                    });
                    return;
                }

                // Some servers accept the join but don't emit a prompt lobby packet
                // quickly. If we saw no explicit JOINERROR, allow opening.
                openViewerOnce();
                safeResolveHandshake({
                    roomId: id_room,
                    clientFlow,
                    mode: 'timeout_fallback_no_error',
                });
            }, Math.max(1000, handshakeTimeoutMs));
        }
    });

    client.on('data', (data) => {
        messageCount++;
        if (debugMode) {
            console.log(`Mensaje ${messageCount}: ${data.toString('hex')}`);
        }

        broadcastEvent('socket_frame', uniqueId, {
            roomId: id_room,
            messageCount,
            hex: data.toString('hex'),
            byteLength: data.length,
        });

        if (spectatorDecoder && spectatorState) {
            try {
                console.log(`[spectator-protocol] push chunk | bytes=${data.length} | hex=${data.toString('hex')}`);
                const spectatorEvents = spectatorDecoder.push(data);
                let nextSpectatorSnapshot = null;
                let spectatorZonesChanged = false;

                for (const event of spectatorEvents) {
                    console.log(`[spectator-protocol] event`, event);
                    nextSpectatorSnapshot = spectatorState.apply(event);
                    if (applySpectatorEventToZones(spectatorZoneTracker, event)) {
                        spectatorZonesChanged = true;
                    }
                }

                if (nextSpectatorSnapshot) {
                    const normalizedSnapshot = normalizeSpectatorSnapshot(nextSpectatorSnapshot);
                    console.log(`[spectator-protocol] snapshot`, normalizedSnapshot);
                    broadcastEvent('spectator_state', uniqueId, {
                        roomId: id_room,
                        messageCount,
                        eventCount: spectatorEvents.length,
                        snapshot: normalizedSnapshot,
                        clientFlow,
                    });
                } else if (spectatorEvents.length === 0) {
                    console.log('[spectator-protocol] no events decoded for this chunk');
                }

                if (spectatorZonesChanged) {
                    const zoneSnapshot = cloneSpectatorZoneTracker(spectatorZoneTracker);
                    console.log('[spectator-protocol] zones', zoneSnapshot);
                    broadcastEvent('spectator_zones', uniqueId, {
                        roomId: id_room,
                        messageCount,
                        zones: zoneSnapshot,
                        clientFlow,
                    });
                }
            } catch (error) {
                console.warn('[spectator-protocol] decode failed', error);
                if (debugMode) {
                    console.warn('Spectator protocol decode failed:', error?.message || error);
                }
            }
        }

        pendingBuffer = pendingBuffer.length > 0 ? Buffer.concat([pendingBuffer, data]) : data;
        if (pendingBuffer.length > MAX_PENDING_BUFFER_BYTES) {
            if (debugMode) {
                broadcastEvent('socket_buffer_reset', uniqueId, {
                    roomId: id_room,
                    reason: 'pending buffer exceeded limit',
                    pendingBytes: pendingBuffer.length,
                    maxPendingBytes: MAX_PENDING_BUFFER_BYTES,
                });
            }
            pendingBuffer = Buffer.alloc(0);
            return;
        }

        const { results, remainingHex } = processStreamBuffer(pendingBuffer);
        pendingBuffer = Buffer.isBuffer(remainingHex) ? remainingHex : Buffer.from(remainingHex || '', 'hex');
        traceLogger.logFrame(messageCount, data, results, pendingBuffer.length);

        if (pendingBuffer.length > 0) {
            broadcastEvent('socket_buffer_pending', uniqueId, {
                roomId: id_room,
                messageCount,
                pendingHex: pendingBuffer.toString('hex'),
                pendingBytes: pendingBuffer.length,
            });
        }

        results.forEach((result, index) => {
            if (debugMode) {
                console.log(`Segmento ${index + 1}: ${result.segment.toString('hex')}`);
                console.log(`Tipo de Mensaje: ${result.messageName} (0x${result.messageType.toString(16)})`);
                console.log(`Longitud esperada: ${result.expectedLength}`);
                console.log(`Longitud actual: ${result.actualLength}`);
                console.log(`Es valido: ${result.isValid}`);
            }

            broadcastEvent('socket_segment', uniqueId, {
                roomId: id_room,
                index: index + 1,
                segment: result.segment.toString('hex'),
                messageType: result.messageType,
                messageName: result.messageName,
                expectedLength: result.expectedLength,
                actualLength: result.actualLength,
                isValid: result.isValid,
            });

            if (result.isValid && messageHandlers[result.messageType]) {
                messageHandlers[result.messageType](result.segment, {
                    uniqueId,
                    roomId: id_room,
                    messageCount,
                    clientFlow,
                });
            } else if (result.isValid) {
                broadcastEvent('socket_unhandled', uniqueId, {
                    roomId: id_room,
                    messageType: result.messageType,
                    messageName: result.messageName,
                    segment: result.segment.toString('hex'),
                });
            }

            if (result.isValid && result.messageType === 0x12) {
                safeResolveHandshake({
                    roomId: id_room,
                    clientFlow,
                });
                openViewerOnce();
            }

            // For password-protected EDOPro rooms, only explicit lobby/join
            // STOC packets should confirm success. Do NOT treat arbitrary
            // packets as success, otherwise wrong-password joins can open.
            if (
                requireHandshakeValidation &&
                result.isValid &&
                HANDSHAKE_SUCCESS_STOC_TYPES.has(result.messageType)
            ) {
                safeResolveHandshake({
                    roomId: id_room,
                    clientFlow,
                    messageType: result.messageType,
                });
                openViewerOnce();
            }

            if (result.isValid && result.messageType === 0x02) {
                const stocError = parseStocErrorSegment(result.segment) || {
                    errorType: null,
                    errorTypeName: 'UNKNOWN',
                    errorCode: null,
                    joinErrorName: null,
                    errorKey: 'STOC_ERROR_UNKNOWN',
                    message: 'Server rejected the request.',
                };
                broadcastEvent('stoc_error', uniqueId, {
                    roomId: id_room,
                    ...stocError,
                    clientFlow,
                });
                if (stocError.errorTypeName === 'JOINERROR') {
                    sawJoinError = true;
                }
                safeRejectHandshake({
                    ...stocError,
                    roomId: id_room,
                    clientFlow,
                });
                if (stocError.errorTypeName === 'JOINERROR') {
                    client.end();
                    client.destroy();
                    return;
                }
            }

            if (
                shouldSwitchToSpectator &&
                !spectatorCommandSent &&
                result.isValid &&
                result.messageType !== 0x02
            ) {
                const toObserverPacket = Buffer.from('010021', 'hex');
                client.write(toObserverPacket);
                traceLogger.logSend('CTOS switch to observer packet', toObserverPacket);
                spectatorCommandSent = true;

                broadcastEvent('socket_send', uniqueId, {
                    roomId: id_room,
                    serverHost: server_host,
                    serverPort: server_port,
                    hex: toObserverPacket.toString('hex'),
                    description: 'CTOS switch to observer packet',
                });
            }

        });
    });

    client.on('end', async () => {
        console.log('Conexion terminada con el servidor');
        activeConnections.delete(uniqueId);
        traceLogger.close('connection_end');
        if (requireHandshakeValidation) {
            safeRejectHandshake({
                errorKey: 'ROOM_JOIN_FAILED',
                error: 'CONNECTION_ENDED',
                message: 'Room rejected the join or closed before confirmation.',
                roomId: id_room,
                clientFlow,
            });
        } else {
            safeRejectHandshake({
                error: 'CONNECTION_ENDED',
                message: 'Connection ended before join confirmation.',
                roomId: id_room,
                clientFlow,
            });
        }
        broadcastEvent('connection_end', uniqueId, { roomId: id_room });
        broadcast('close', uniqueId);
    });

    client.on('error', (err) => {
        console.error('Error durante la conexion:', err);
        activeConnections.delete(uniqueId);
        traceLogger.close(`connection_error:${err.message}`);
        safeRejectHandshake({
            error: 'CONNECTION_ERROR',
            message: err.message,
            roomId: id_room,
            clientFlow,
        });
        broadcastEvent('connection_error', uniqueId, {
            roomId: id_room,
            error: err.message,
            clientFlow,
        });
    });

    return {
        close: () => closeConnection(uniqueId),
    };
}

function closeConnection(uniqueId) {
    const client = activeConnections.get(uniqueId);
    if (!client) {
        return false;
    }

    activeConnections.delete(uniqueId);

    try {
        client.removeAllListeners('data');
        client.removeAllListeners('end');
        client.removeAllListeners('error');
        client.end();
        client.destroy();
    } catch (_) {
        try {
            client.destroy();
        } catch (_) {
            // ignore
        }
    }

    return true;
}

module.exports = { establecer_conexion, closeConnection };
module.exports._test = {
    parseStocErrorSegment,
    HANDSHAKE_SUCCESS_STOC_TYPES: new Set(HANDSHAKE_SUCCESS_STOC_TYPES),
};
