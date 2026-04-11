const fs = require('fs');
const path = require('path');
const STOC_MSG = require('../messages/STOC_MSG');
const COMMON_MSG = require('../messages/COMMON_MSG.JS');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function ensureDir() {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch (_) {
        // ignore
    }
}

function timestamp() {
    return new Date().toISOString();
}

function buildGameMessageNameMap() {
    const map = {};
    Object.entries(COMMON_MSG)
        .filter(([key, value]) => key.startsWith('MSG_') && Number.isFinite(Number(value)))
        .forEach(([key, value]) => {
            map[Number(value)] = key;
        });
    return map;
}

const GAME_MESSAGE_NAME_MAP = buildGameMessageNameMap();

function getTraceFilePath(uniqueId) {
    return path.join(LOG_DIR, `message-trace-${uniqueId}.txt`);
}

function appendLine(filePath, line) {
    try {
        fs.appendFileSync(filePath, `${line}\n`, 'utf8');
    } catch (_) {
        // keep tracer non-blocking for runtime
    }
}

function formatSegmentType(result) {
    const messageHex = Number.isFinite(Number(result?.messageType))
        ? `0x${Number(result.messageType).toString(16)}`
        : 'n/a';
    const messageName = result?.messageName || 'UNKNOWN';
    return `${messageName} (${messageHex})`;
}

function extractGameMessageType(segmentBuffer) {
    if (!Buffer.isBuffer(segmentBuffer) || segmentBuffer.length < 4) {
        return { gameType: null, gameName: null };
    }
    const gameType = segmentBuffer.readUInt8(3);
    return {
        gameType,
        gameName: GAME_MESSAGE_NAME_MAP[gameType] || null,
    };
}

function createTraceLogger({ uniqueId, roomId, clientFlow, enabled = true }) {
    const active = enabled !== false;
    const filePath = getTraceFilePath(uniqueId);

    if (!active) {
        return {
            filePath,
            enabled: false,
            logSend() { },
            logFrame() { },
            close() { },
        };
    }

    ensureDir();
    appendLine(filePath, '============================================================');
    appendLine(filePath, `Trace start: ${timestamp()}`);
    appendLine(filePath, `Unique ID: ${uniqueId}`);
    appendLine(filePath, `Room ID: ${roomId}`);
    appendLine(filePath, `Flow: ${clientFlow}`);
    appendLine(filePath, 'Format: FRAME -> CHAIN -> SEGMENTS');
    appendLine(filePath, '============================================================');

    return {
        filePath,
        enabled: true,
        logSend(description, packetBuffer) {
            const hex = Buffer.isBuffer(packetBuffer) ? packetBuffer.toString('hex') : String(packetBuffer || '');
            appendLine(filePath, `[${timestamp()}] SEND ${description || 'packet'} | bytes=${Math.floor(hex.length / 2)} | hex=${hex}`);
        },
        logFrame(frameNumber, frameBuffer, results, pendingBytes = 0) {
            const hex = Buffer.isBuffer(frameBuffer) ? frameBuffer.toString('hex') : '';
            const safeResults = Array.isArray(results) ? results : [];
            const chain = safeResults.map((result) => {
                if (Number(result?.messageType) === STOC_MSG.STOC_GAME_MSG) {
                    const { gameName, gameType } = extractGameMessageType(result.segment);
                    if (gameName) {
                        return `${result.messageName}:${gameName}(0x${Number(gameType).toString(16)})`;
                    }
                }
                return formatSegmentType(result);
            }).join(' -> ') || '(no complete segments)';

            appendLine(filePath, '');
            appendLine(filePath, `[${timestamp()}] FRAME #${frameNumber} | bytes=${Buffer.isBuffer(frameBuffer) ? frameBuffer.length : 0} | pending=${pendingBytes}`);
            appendLine(filePath, `HEX: ${hex}`);
            appendLine(filePath, `CHAIN: ${chain}`);

            safeResults.forEach((result, index) => {
                const segmentHex = Buffer.isBuffer(result.segment) ? result.segment.toString('hex') : String(result.segment || '');
                appendLine(
                    filePath,
                    `  [${index + 1}] ${formatSegmentType(result)} | valid=${result.isValid} | expected=${result.expectedLength} | actual=${result.actualLength}`
                );

                if (Number(result?.messageType) === STOC_MSG.STOC_GAME_MSG) {
                    const { gameName, gameType } = extractGameMessageType(result.segment);
                    const gameHex = gameType === null || gameType === undefined ? 'n/a' : `0x${Number(gameType).toString(16)}`;
                    appendLine(filePath, `      GAME_MSG: ${gameName || 'UNKNOWN_GAME_MSG'} (${gameHex})`);
                }

                appendLine(filePath, `      SEG_HEX: ${segmentHex}`);
            });
        },
        close(reason = '') {
            appendLine(filePath, '');
            appendLine(filePath, `[${timestamp()}] Trace end${reason ? ` | reason=${reason}` : ''}`);
            appendLine(filePath, '============================================================');
        },
    };
}

module.exports = {
    createTraceLogger,
    getTraceFilePath,
};
