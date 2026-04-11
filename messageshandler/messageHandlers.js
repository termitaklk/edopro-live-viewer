const STOC_MSG = require('../messages/STOC_MSG');
const COMMON_MSG = require('../messages/COMMON_MSG.JS');
const { broadcastEvent } = require('../tcp-conexion/websocket');

const MAX_QUERY_BLOCKS_PER_CARD = 128;
const MAX_UPDATE_DATA_CARDS = 512;
const MAX_QUERY_SUBITEMS = 256;
const MAX_DRAW_CARDS = 120;
const MAX_SHUFFLE_CARDS = 120;

function toBuffer(segment) {
    return Buffer.isBuffer(segment) ? segment : Buffer.from(segment, 'hex');
}

function decodeName(buffer) {
    return buffer.toString('utf16le').replace(/\0/g, '').trim();
}

function emit(uniqueId, type, payload) {
    if (!uniqueId) {
        return;
    }

    const clientFlow = String(payload?.clientFlow || '').trim().toLowerCase();
    broadcastEvent(type, uniqueId, {
        ...payload,
        clientFlow: clientFlow === 'mercury' ? 'mercury' : 'edopro',
    });
}

function choiceName(value) {
    switch (value) {
        case 1:
            return 'SCISSOR';
        case 2:
            return 'ROCK';
        case 3:
            return 'PAPER';
        default:
            return 'UNKNOWN';
    }
}

function resolveRpsWinner(choice1, choice2) {
    if (choice1 === choice2) {
        return 'TIE';
    }

    if (
        (choice1 === 3 && choice2 === 2) ||
        (choice1 === 2 && choice2 === 1) ||
        (choice1 === 1 && choice2 === 3)
    ) {
        return 'PLAYER_ONE_WINNER';
    }

    return 'PLAYER_TWO_WINNER';
}

function handleTypeChange(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const type = buffer.readUInt8(3);

        emit(context.uniqueId, 'waiting_type_change', {
            roomId: context.roomId,
            type,
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_TYPE_CHANGE:', error);
    }
}

function handleDuelStart(_segment, context = {}) {
    emit(context.uniqueId, 'duel_start', {
        roomId: context.roomId,
        clientFlow: context.clientFlow,
    });
}

function handleDuelEnd(_segment, context = {}) {
    emit(context.uniqueId, 'duel_end', {
        roomId: context.roomId,
        clientFlow: context.clientFlow,
    });
}

function parseErrorPayload(segment) {
    const buffer = toBuffer(segment);
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

    return {
        errorType,
        errorTypeName,
        errorCode,
        joinErrorName,
    };
}

function handleErrorMsg(segment, context = {}) {
    try {
        const parsed = parseErrorPayload(segment);
        emit(context.uniqueId, 'stoc_error', {
            roomId: context.roomId,
            ...(parsed || { errorType: null, errorTypeName: 'UNKNOWN', errorCode: null, joinErrorName: null }),
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_ERROR_MSG:', error);
    }
}

function handleCatchup(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const isCatchingUp = buffer.length >= 4 ? !!buffer.readUInt8(3) : false;

        emit(context.uniqueId, 'catchup_state', {
            roomId: context.roomId,
            isCatchingUp,
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_CATCHUP:', error);
    }
}

function handleTimeLimit(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const player = buffer.length >= 4 ? buffer.readUInt8(3) : null;
        let timeLeft = null;
        let time16le = null;
        let time16be = null;
        let time16leOff5 = null;
        let time16beOff5 = null;

        if (buffer.length >= 6) {
            time16le = buffer.readUInt16LE(4);
            time16be = buffer.readUInt16BE(4);
            const candidates = [time16le, time16be];

            // Some flows include an extra byte before the timer field.
            // In those cases, the actual timer is at offset 5 (little-endian).
            if (buffer.length >= 7) {
                time16leOff5 = buffer.readUInt16LE(5);
                time16beOff5 = buffer.readUInt16BE(5);
                candidates.push(time16leOff5, time16beOff5);
            }

            const validCandidates = candidates.filter((value) => Number.isFinite(value) && value >= 0 && value <= 7200);
            // Prefer the largest valid value: avoids selecting misaligned small-byte artifacts (e.g. 88 from 00 58).
            timeLeft = validCandidates.length > 0 ? Math.max(...validCandidates) : time16le;
        }

        emit(context.uniqueId, 'time_limit', {
            roomId: context.roomId,
            player,
            timeLeft,
            time16le,
            time16be,
            time16leOff5,
            time16beOff5,
            payloadHex: buffer.toString('hex'),
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_TIME_LIMIT:', error);
    }
}

function handleHandResult(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const choice1 = buffer.readUInt8(3);
        const choice2 = buffer.readUInt8(4);
        const result = resolveRpsWinner(choice1, choice2);

        emit(context.uniqueId, 'rps_result', {
            roomId: context.roomId,
            choice1,
            choice2,
            choice1Name: choiceName(choice1),
            choice2Name: choiceName(choice2),
            result,
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_HAND_RESULT:', error);
    }
}

function parseGameMessage(segment) {
    const buffer = toBuffer(segment);
    const gameMessageType = buffer.readUInt8(3);
    const payload = buffer.slice(4);

    return { buffer, gameMessageType, payload };
}

function createReader(buffer, offset = 0) {
    return {
        buffer,
        offset,
        remaining() {
            return Math.max(0, buffer.length - this.offset);
        },
        canRead(size) {
            return this.offset + size <= buffer.length;
        },
        readUInt8() {
            if (!this.canRead(1)) return null;
            const value = buffer.readUInt8(this.offset);
            this.offset += 1;
            return value;
        },
        readUInt16LE() {
            if (!this.canRead(2)) return null;
            const value = buffer.readUInt16LE(this.offset);
            this.offset += 2;
            return value;
        },
        readUInt32LE() {
            if (!this.canRead(4)) return null;
            const value = buffer.readUInt32LE(this.offset);
            this.offset += 4;
            return value;
        },
        readInt32LE() {
            if (!this.canRead(4)) return null;
            const value = buffer.readInt32LE(this.offset);
            this.offset += 4;
            return value;
        },
        readBigUInt64LE() {
            if (!this.canRead(8)) return null;
            const value = buffer.readBigUInt64LE(this.offset);
            this.offset += 8;
            return value;
        },
        readBuffer(size) {
            if (!this.canRead(size)) return null;
            const value = buffer.slice(this.offset, this.offset + size);
            this.offset += size;
            return value;
        },
        skip(size) {
            this.offset = Math.min(buffer.length, this.offset + size);
        },
    };
}

function parseLocInfo(reader) {
    const controller = reader.readUInt8();
    const location = reader.readUInt8();
    const sequence = reader.readUInt32LE();
    const position = reader.readUInt32LE();

    if ([controller, location, sequence, position].some((value) => value === null || value === undefined)) {
        return null;
    }

    return {
        controller,
        location,
        sequence,
        position,
    };
}

function parseQueryBlockPayload(flag, payload) {
    const reader = createReader(payload);
    switch (flag) {
        case COMMON_MSG.QUERY_CODE:
            return { code: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_POSITION:
            return { position: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_ALIAS:
            return { alias: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_TYPE:
            return { cardType: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_LEVEL:
            return { level: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_RANK:
            return { rank: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_ATTRIBUTE:
            return { attribute: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_RACE:
            return { race: reader.canRead(8) ? Number(reader.readBigUInt64LE()) : null };
        case COMMON_MSG.QUERY_ATTACK:
            return { attack: reader.readInt32LE() };
        case COMMON_MSG.QUERY_DEFENSE:
            return { defense: reader.readInt32LE() };
        case COMMON_MSG.QUERY_BASE_ATTACK:
            return { baseAttack: reader.readInt32LE() };
        case COMMON_MSG.QUERY_BASE_DEFENSE:
            return { baseDefense: reader.readInt32LE() };
        case COMMON_MSG.QUERY_REASON:
            return { reason: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_OWNER:
            return { owner: reader.readUInt8() };
        case COMMON_MSG.QUERY_STATUS:
            return { status: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_IS_PUBLIC:
            return { isPublic: reader.readUInt8() };
        case COMMON_MSG.QUERY_LSCALE:
            return { lscale: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_RSCALE:
            return { rscale: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_IS_HIDDEN:
            return { isHidden: reader.readUInt8() };
        case COMMON_MSG.QUERY_COVER:
            return { cover: reader.readUInt32LE() };
        case COMMON_MSG.QUERY_REASON_CARD:
            return { reasonCard: parseLocInfo(reader) };
        case COMMON_MSG.QUERY_EQUIP_CARD:
            return { equipCard: parseLocInfo(reader) };
        case COMMON_MSG.QUERY_TARGET_CARD: {
            const count = reader.readUInt32LE();
            const targetCards = [];
            const cappedCount = Math.min(Number(count || 0), MAX_QUERY_SUBITEMS);
            for (let index = 0; index < cappedCount; index += 1) {
                const info = parseLocInfo(reader);
                if (!info) break;
                targetCards.push(info);
            }
            return { targetCards };
        }
        case COMMON_MSG.QUERY_OVERLAY_CARD: {
            const count = reader.readUInt32LE();
            const overlayCards = [];
            const cappedCount = Math.min(Number(count || 0), MAX_QUERY_SUBITEMS);
            for (let index = 0; index < cappedCount; index += 1) {
                const value = reader.readUInt32LE();
                if (value === null || value === undefined) break;
                overlayCards.push(value);
            }
            return { overlayCards };
        }
        case COMMON_MSG.QUERY_COUNTERS: {
            const count = reader.readUInt32LE();
            const counters = [];
            const cappedCount = Math.min(Number(count || 0), MAX_QUERY_SUBITEMS);
            for (let index = 0; index < cappedCount; index += 1) {
                const value = reader.readUInt32LE();
                if (value === null || value === undefined) break;
                counters.push(value);
            }
            return { counters };
        }
        case COMMON_MSG.QUERY_LINK:
            return {
                link: reader.readUInt32LE(),
                linkMarker: reader.readUInt32LE(),
            };
        default:
            return {};
    }
}

function parseQuery(reader) {
    const startOffset = reader.offset;
    const result = {
        flags: 0,
        code: null,
        position: null,
        attack: null,
        defense: null,
        level: null,
        rank: null,
        cardType: null,
        attribute: null,
        race: null,
    };

    let blockCount = 0;
    // A query block can be as small as 2 bytes when size=0 (onfield skipped).
    while (reader.remaining() >= 2 && blockCount < MAX_QUERY_BLOCKS_PER_CARD) {
        const blockStart = reader.offset;
        const size = reader.readUInt16LE();
        if (size === null || size === undefined) {
            break;
        }

        if (size === 0) {
            result.onfieldSkipped = true;
            break;
        }

        const flag = reader.readUInt32LE();
        if (flag === null || flag === undefined) {
            break;
        }

        const payloadSize = Math.max(0, size - 4);
        let payload = null;
        if (payloadSize > 0) {
            if (!reader.canRead(payloadSize)) {
                result.truncated = true;
                break;
            }
            payload = reader.readBuffer(payloadSize);
        }
        const parsed = payload ? parseQueryBlockPayload(flag, payload) : {};

        result.flags |= flag;
        if (parsed.code !== undefined && parsed.code !== null) {
            result.code = parsed.code;
        }
        if (parsed.position !== undefined && parsed.position !== null) {
            result.position = parsed.position;
        }
        if (parsed.attack !== undefined && parsed.attack !== null) {
            result.attack = parsed.attack;
        }
        if (parsed.defense !== undefined && parsed.defense !== null) {
            result.defense = parsed.defense;
        }
        if (parsed.level !== undefined && parsed.level !== null) {
            result.level = parsed.level;
        }
        if (parsed.rank !== undefined && parsed.rank !== null) {
            result.rank = parsed.rank;
        }
        if (parsed.cardType !== undefined && parsed.cardType !== null) {
            result.cardType = parsed.cardType;
        }
        if (parsed.attribute !== undefined && parsed.attribute !== null) {
            result.attribute = parsed.attribute;
        }
        if (parsed.race !== undefined && parsed.race !== null) {
            result.race = parsed.race;
        }

        if (flag === COMMON_MSG.QUERY_END) {
            break;
        }

        blockCount += 1;

        if (reader.offset <= blockStart) {
            result.noProgress = true;
            break;
        }
    }

    result.bytesRead = Math.max(0, reader.offset - startOffset);
    result.blockCount = blockCount;
    return result;
}

function parseUpdateCardPayload(payload) {
    if (!payload || payload.length < 3) {
        return null;
    }

    const reader = createReader(payload);
    const player = reader.readUInt8();
    const location = reader.readUInt8();
    const sequence = reader.readUInt8();
    const query = parseQuery(reader);

    return {
        player,
        location,
        sequence,
        flags: query?.flags ?? null,
        code: query?.code ?? null,
        position: query?.position ?? null,
        attack: query?.attack ?? null,
        defense: query?.defense ?? null,
        level: query?.level ?? null,
        rank: query?.rank ?? null,
        cardType: query?.cardType ?? null,
        attribute: query?.attribute ?? null,
        race: query?.race ?? null,
    };
}

function parseUpdateDataPayload(payload) {
    if (!payload || payload.length < 6) {
        return null;
    }

    const reader = createReader(payload);
    const player = reader.readUInt8();
    const location = reader.readUInt8();
    const totalSize = reader.readUInt32LE();
    const cards = [];
    let sequence = 0;
    const queryStreamStart = reader.offset;
    const numericTotal = Number(totalSize);
    const bytesBudget = Number.isFinite(numericTotal) && numericTotal >= 0
        ? Math.min(numericTotal, reader.remaining())
        : reader.remaining();
    const budgetEnd = queryStreamStart + bytesBudget;

    while (
        reader.offset < budgetEnd &&
        reader.remaining() >= 2 &&
        cards.length < MAX_UPDATE_DATA_CARDS
    ) {
        const beforeOffset = reader.offset;
        const query = parseQuery(reader);
        const consumed = Math.max(0, reader.offset - beforeOffset);
        if (consumed <= 0 || query?.noProgress) {
            break;
        }

        cards.push({
            sequence,
            flags: query?.flags ?? null,
            code: query?.code ?? null,
            position: query?.position ?? null,
            attack: query?.attack ?? null,
            defense: query?.defense ?? null,
            level: query?.level ?? null,
            rank: query?.rank ?? null,
            cardType: query?.cardType ?? null,
            attribute: query?.attribute ?? null,
            race: query?.race ?? null,
            onfieldSkipped: !!query?.onfieldSkipped,
        });
        sequence += 1;

        if (query?.truncated) {
            break;
        }
    }

    return {
        player,
        location,
        cards,
        totalSize,
    };
}

function parseStartPayload(payload) {
    if (!payload || payload.length < 15) {
        return null;
    }

    const reader = createReader(payload);
    const playerType = reader.readUInt8();
    const lp0 = reader.readUInt32LE();
    const lp1 = reader.readUInt32LE();
    const deck0 = reader.readUInt16LE();
    const extra0 = reader.readUInt16LE();
    const deck1 = reader.readUInt16LE();
    const extra1 = reader.readUInt16LE();

    return {
        playerType,
        lp0,
        lp1,
        deck0,
        extra0,
        deck1,
        extra1,
    };
}

function parseDrawPayload(payload) {
    if (!payload || payload.length < 5) {
        return null;
    }

    const reader = createReader(payload);
    const player = reader.readUInt8();
    const count = reader.readUInt32LE();
    const cards = [];

    const cappedCount = Math.min(Number(count || 0), MAX_DRAW_CARDS);
    for (let index = 0; index < cappedCount; index += 1) {
        const code = reader.readUInt32LE();
        const position = reader.readUInt32LE();
        if (code === null || code === undefined) {
            break;
        }
        cards.push({
            code,
            position,
        });
    }

    return {
        player,
        count,
        cards,
    };
}

function parseShuffleHandPayload(payload) {
    if (!payload || payload.length < 5) {
        return null;
    }

    const reader = createReader(payload);
    const player = reader.readUInt8();
    const count = reader.readUInt32LE();
    const cards = [];

    const cappedCount = Math.min(Number(count || 0), MAX_SHUFFLE_CARDS);
    for (let index = 0; index < cappedCount; index += 1) {
        const code = reader.readUInt32LE();
        if (code === null || code === undefined) {
            break;
        }
        cards.push(code);
    }

    return {
        player,
        count,
        cards,
    };
}

function parseMoveCompact(payload) {
    // Compact layout is fixed: 16 bytes total payload.
    if (!payload || payload.length !== 16) {
        return null;
    }

    const isLikelyLocation = (value) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 0xff;
    const isLikelyController = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 3;

    const reader = createReader(payload);
    const code = reader.readUInt32LE();
    const previous = {
        controller: reader.readUInt8(),
        location: reader.readUInt8(),
        sequence: reader.readUInt8(),
        position: reader.readUInt8(),
    };
    const current = {
        controller: reader.readUInt8(),
        location: reader.readUInt8(),
        sequence: reader.readUInt8(),
        position: reader.readUInt8(),
    };
    const reason = reader.readUInt32LE();

    const valid =
        code !== null &&
        reason !== null &&
        isLikelyController(previous.controller) &&
        isLikelyController(current.controller) &&
        isLikelyLocation(previous.location) &&
        isLikelyLocation(current.location);

    if (!valid) {
        return null;
    }

    return {
        code,
        previousController: previous.controller,
        previousLocation: previous.location,
        previousSequence: previous.sequence,
        previousPosition: previous.position,
        currentController: current.controller,
        currentLocation: current.location,
        currentSequence: current.sequence,
        currentPosition: current.position,
        reason,
        parserVariant: 'compact',
    };
}

function parseMoveExtended(payload) {
    // Extended layout is fixed: 28 bytes total payload.
    if (!payload || payload.length !== 28) {
        return null;
    }

    const reader = createReader(payload);
    const code = reader.readUInt32LE();
    const previous = parseLocInfo(reader);
    const current = parseLocInfo(reader);
    const reason = reader.readUInt32LE();
    if (!previous || !current) {
        return null;
    }

    return {
        code,
        previousController: previous.controller,
        previousLocation: previous.location,
        previousSequence: previous.sequence,
        previousPosition: previous.position,
        currentController: current.controller,
        currentLocation: current.location,
        currentSequence: current.sequence,
        currentPosition: current.position,
        reason,
        parserVariant: 'extended',
    };
}

function parseMovePayload(payload, clientFlow = 'edopro') {
    if (!payload) {
        return null;
    }

    // Prefer deterministic selection by exact payload size.
    if (payload.length === 16) {
        return parseMoveCompact(payload);
    }
    if (payload.length === 28) {
        return parseMoveExtended(payload);
    }

    const flow = String(clientFlow || '').toLowerCase();

    // Flow-specific priority:
    // - EDOPro commonly uses compact move payloads.
    // - Mercury usually follows the extended payload.
    if (flow === 'mercury') {
        return parseMoveExtended(payload) || parseMoveCompact(payload);
    }

    // Default (edopro/unknown): compact first, then fallback.
    return parseMoveCompact(payload) || parseMoveExtended(payload);
}

function parseReloadFieldPayload(payload) {
    function parseWithCompatMode(rawPayload, compatMode) {
        const reader = createReader(rawPayload);
        const result = {
            compatMode,
            duelOptions: null,
            duelField: null,
            lp: { 0: null, 1: null },
            zones: [],
            counts: {
                deck: { 0: 0, 1: 0 },
                hand: { 0: 0, 1: 0 },
                grave: { 0: 0, 1: 0 },
                banished: { 0: 0, 1: 0 },
                extra: { 0: 0, 1: 0 },
                extraFaceupPendulum: { 0: 0, 1: 0 },
            },
            parseError: null,
        };

        const readCount = () => {
            const value = compatMode ? reader.readUInt8() : reader.readUInt32LE();
            if (value === null || value === undefined) return null;
            return Number(value);
        };

        if (compatMode) {
            const duelField = reader.readUInt8();
            if (duelField === null || duelField === undefined) {
                result.parseError = 'missing duelField';
                return result;
            }
            result.duelField = duelField;
        } else {
            const duelOptions = reader.readUInt32LE();
            if (duelOptions === null || duelOptions === undefined) {
                result.parseError = 'missing duelOptions';
                return result;
            }
            result.duelOptions = duelOptions;
        }

        for (let controller = 0; controller < 2; controller += 1) {
            const lp = reader.readUInt32LE();
            if (lp === null || lp === undefined) {
                result.parseError = 'missing lp';
                return result;
            }
            result.lp[String(controller)] = Number(lp);

            for (let sequence = 0; sequence < 7; sequence += 1) {
                const isUsed = reader.readUInt8();
                if (isUsed === null || isUsed === undefined) {
                    result.parseError = 'missing mzone used flag';
                    return result;
                }
                if (!isUsed) continue;
                const position = reader.readUInt8();
                if (position === null || position === undefined) {
                    result.parseError = 'missing mzone position';
                    return result;
                }
                const xyzCount = readCount();
                if (xyzCount === null) {
                    result.parseError = 'missing mzone xyz count';
                    return result;
                }
                result.zones.push({
                    controller,
                    location: COMMON_MSG.LOCATION_MZONE,
                    sequence,
                    position,
                    xyzCount,
                });
            }

            for (let sequence = 0; sequence < 8; sequence += 1) {
                const isUsed = reader.readUInt8();
                if (isUsed === null || isUsed === undefined) {
                    result.parseError = 'missing szone used flag';
                    return result;
                }
                if (!isUsed) continue;
                const position = reader.readUInt8();
                if (position === null || position === undefined) {
                    result.parseError = 'missing szone position';
                    return result;
                }
                let xyzCount = 0;
                if (!compatMode) {
                    const value = reader.readUInt32LE();
                    if (value === null || value === undefined) {
                        result.parseError = 'missing szone xyz count';
                        return result;
                    }
                    xyzCount = Number(value);
                }
                result.zones.push({
                    controller,
                    location: COMMON_MSG.LOCATION_SZONE,
                    sequence,
                    position,
                    xyzCount,
                });
            }

            const deckCount = readCount();
            const handCount = readCount();
            const graveCount = readCount();
            const banishedCount = readCount();
            const extraCount = readCount();
            const extraFaceupPendulumCount = readCount();

            if (
                deckCount === null ||
                handCount === null ||
                graveCount === null ||
                banishedCount === null ||
                extraCount === null ||
                extraFaceupPendulumCount === null
            ) {
                result.parseError = 'missing pile counts';
                return result;
            }

            result.counts.deck[String(controller)] = deckCount;
            result.counts.hand[String(controller)] = handCount;
            result.counts.grave[String(controller)] = graveCount;
            result.counts.banished[String(controller)] = banishedCount;
            result.counts.extra[String(controller)] = extraCount;
            result.counts.extraFaceupPendulum[String(controller)] = extraFaceupPendulumCount;
        }

        const solvingChains = readCount();
        if (solvingChains === null) {
            result.parseError = 'missing solvingChains';
            return result;
        }

        result.solvingChains = solvingChains;
        result.remainingBytes = reader.remaining();
        return result;
    }

    if (!payload || payload.length < 4) {
        return null;
    }

    const nonCompat = parseWithCompatMode(payload, false);
    const compat = parseWithCompatMode(payload, true);

    const candidates = [nonCompat, compat].filter((item) => !item.parseError);
    if (candidates.length === 0) {
        return nonCompat;
    }

    candidates.sort((a, b) => Number(a.remainingBytes || 0) - Number(b.remainingBytes || 0));
    return candidates[0];
}

function handleGameMessage(segment, context = {}) {
    try {
        const { gameMessageType, payload } = parseGameMessage(segment);

        switch (gameMessageType) {
            case COMMON_MSG.MSG_START:
                {
                    const start = parseStartPayload(payload);
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_START',
                    rawType: gameMessageType,
                    ...(start || { payloadHex: payload.toString('hex') }),
                    clientFlow: context.clientFlow,
                });
                }
                break;

            case COMMON_MSG.MSG_NEW_TURN:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_NEW_TURN',
                    rawType: gameMessageType,
                    player: payload.length > 0 ? payload.readUInt8(0) : null,
                    clientFlow: context.clientFlow,
                });
                break;

            case COMMON_MSG.MSG_NEW_PHASE:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_NEW_PHASE',
                    rawType: gameMessageType,
                    phase: payload.length >= 2 ? payload.readUInt16LE(0) : null,
                    clientFlow: context.clientFlow,
                });
                break;

            case COMMON_MSG.MSG_DRAW:
                {
                    const draw = parseDrawPayload(payload);
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_DRAW',
                    rawType: gameMessageType,
                    ...(draw || { payloadHex: payload.toString('hex') }),
                    clientFlow: context.clientFlow,
                });
                }
                break;

            case COMMON_MSG.MSG_SHUFFLE_HAND:
                {
                    const shuffle = parseShuffleHandPayload(payload);
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_SHUFFLE_HAND',
                    rawType: gameMessageType,
                    ...(shuffle || { payloadHex: payload.toString('hex') }),
                    clientFlow: context.clientFlow,
                });
                }
                break;

            case COMMON_MSG.MSG_DAMAGE:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_DAMAGE',
                    rawType: gameMessageType,
                    player: payload.length > 0 ? payload.readUInt8(0) : null,
                    amount: payload.length >= 5 ? payload.readUInt32LE(1) : null,
                    clientFlow: context.clientFlow,
                });
                break;

            case COMMON_MSG.MSG_RECOVER:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_RECOVER',
                    rawType: gameMessageType,
                    player: payload.length > 0 ? payload.readUInt8(0) : null,
                    amount: payload.length >= 5 ? payload.readUInt32LE(1) : null,
                    clientFlow: context.clientFlow,
                });
                break;

            case COMMON_MSG.MSG_LPUPDATE:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_LPUPDATE',
                    rawType: gameMessageType,
                    player: payload.length > 0 ? payload.readUInt8(0) : null,
                    lp: payload.length >= 5 ? payload.readUInt32LE(1) : null,
                    clientFlow: context.clientFlow,
                });
                break;

            case COMMON_MSG.MSG_PAY_LPCOST:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_PAY_LPCOST',
                    rawType: gameMessageType,
                    player: payload.length > 0 ? payload.readUInt8(0) : null,
                    amount: payload.length >= 5 ? payload.readUInt32LE(1) : null,
                    // Keep alias for protocol docs/history where this field is named "cost".
                    cost: payload.length >= 5 ? payload.readUInt32LE(1) : null,
                    clientFlow: context.clientFlow,
                });
                break;

            case COMMON_MSG.MSG_MOVE:
                {
                    const move = parseMovePayload(payload, context.clientFlow);
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'MSG_MOVE',
                    rawType: gameMessageType,
                    ...(move || { payloadHex: payload.toString('hex') }),
                    clientFlow: context.clientFlow,
                });
                }
                break;

            case COMMON_MSG.MSG_UPDATE_CARD:
                {
                    const update = parseUpdateCardPayload(payload);
                    emit(context.uniqueId, 'game_msg', {
                        roomId: context.roomId,
                        type: 'MSG_UPDATE_CARD',
                        rawType: gameMessageType,
                        ...(update || { payloadHex: payload.toString('hex') }),
                        clientFlow: context.clientFlow,
                    });
                }
                break;

            case COMMON_MSG.MSG_UPDATE_DATA:
                {
                    const update = parseUpdateDataPayload(payload);
                    emit(context.uniqueId, 'game_msg', {
                        roomId: context.roomId,
                        type: 'MSG_UPDATE_DATA',
                        rawType: gameMessageType,
                        ...(update || { payloadHex: payload.toString('hex') }),
                        clientFlow: context.clientFlow,
                    });
                }
                break;

            case COMMON_MSG.MSG_RELOAD_FIELD:
                {
                    const reload = parseReloadFieldPayload(payload);
                    emit(context.uniqueId, 'reload_field', {
                        roomId: context.roomId,
                        ...(reload || { payloadHex: payload.toString('hex') }),
                        clientFlow: context.clientFlow,
                    });
                }
                break;

            default:
                emit(context.uniqueId, 'game_msg', {
                    roomId: context.roomId,
                    type: 'UNHANDLED',
                    rawType: gameMessageType,
                    payloadHex: payload.toString('hex'),
                    clientFlow: context.clientFlow,
                });
                break;
        }
    } catch (error) {
        console.error('Error handling STOC_GAME_MSG:', error);
    }
}

const messageHandlers = {
    [STOC_MSG.STOC_GAME_MSG]: handleGameMessage,
    [STOC_MSG.STOC_ERROR_MSG]: handleErrorMsg,
    [STOC_MSG.STOC_HAND_RESULT]: handleHandResult,
    [STOC_MSG.STOC_TYPE_CHANGE]: handleTypeChange,
    [STOC_MSG.STOC_DUEL_START]: handleDuelStart,
    [STOC_MSG.STOC_DUEL_END]: handleDuelEnd,
    [STOC_MSG.STOC_TIME_LIMIT]: handleTimeLimit,
    [STOC_MSG.STOC_CATCHUP]: handleCatchup,
    [STOC_MSG.STOC_HS_PLAYER_ENTER]: handlePlayerEnter,
    [STOC_MSG.STOC_HS_PLAYER_CHANGE]: handlePlayerChange,
    [STOC_MSG.STOC_HS_WATCH_CHANGE]: handleWatchChange,
};

module.exports = messageHandlers;
module.exports._test = {
    parseMovePayload,
    parseMoveCompact,
    parseMoveExtended,
    parseErrorPayload,
};

function handlePlayerEnter(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const name = decodeName(buffer.slice(3, 43));
        const position = buffer.length > 43 ? buffer.readUInt8(43) : null;

        emit(context.uniqueId, 'waiting_player_enter', {
            roomId: context.roomId,
            name,
            position,
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_HS_PLAYER_ENTER:', error);
    }
}

function handlePlayerChange(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const status = buffer.readUInt8(3);
        const position = status >> 4;
        const stateCode = status & 0x0f;
        const stateName = playerRoomStateName(stateCode);

        emit(context.uniqueId, 'waiting_player_change', {
            roomId: context.roomId,
            position,
            stateCode,
            stateName,
            rawStatus: status,
            isLobbyState: stateName !== null,
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_HS_PLAYER_CHANGE:', error);
    }
}

function handleWatchChange(segment, context = {}) {
    try {
        const buffer = toBuffer(segment);
        const count = buffer.readUInt16LE(3);

        emit(context.uniqueId, 'waiting_watch_change', {
            roomId: context.roomId,
            count,
            clientFlow: context.clientFlow,
        });
    } catch (error) {
        console.error('Error handling STOC_HS_WATCH_CHANGE:', error);
    }
}

function playerRoomStateName(stateCode) {
    switch (stateCode) {
        case 0x08:
            return 'SPECTATE';
        case 0x09:
            return 'READY';
        case 0x0a:
            return 'NOT_READY';
        case 0x0b:
            return 'LEAVE';
        default:
            return null;
    }
}
