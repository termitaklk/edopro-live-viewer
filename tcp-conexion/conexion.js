const net = require('net');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const { processStreamBuffer } = require('../tcp-conexion/validate');
const messageHandlers = require('../messageshandler/messageHandlers');
const { broadcast, broadcastEvent } = require('./websocket');
const { createTraceLogger } = require('./message-trace');
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

        if (debugMode) {
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
        }

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

        if (debugMode) {
            broadcastEvent('socket_frame', uniqueId, {
                roomId: id_room,
                messageCount,
                hex: data.toString('hex'),
                byteLength: data.length,
            });
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

        if (debugMode && pendingBuffer.length > 0) {
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
            }

            if (result.isValid && messageHandlers[result.messageType]) {
                messageHandlers[result.messageType](result.segment, {
                    uniqueId,
                    roomId: id_room,
                    messageCount,
                    clientFlow,
                });
            } else if (result.isValid && debugMode) {
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

                if (debugMode) {
                    broadcastEvent('socket_send', uniqueId, {
                        roomId: id_room,
                        serverHost: server_host,
                        serverPort: server_port,
                        hex: toObserverPacket.toString('hex'),
                        description: 'CTOS switch to observer packet',
                    });
                }
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
