(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
        return;
    }
    root.DuelMessageDecoder = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    'use strict';

    const STOC_GAME_MSG = 0x01;
    const STOC_TIME_LIMIT = 0x18;
    const STOC_JOIN_GAME = 0x12;
    const STOC_TYPE_CHANGE = 0x13;
    const STOC_DUEL_START = 0x15;
    const STOC_HS_PLAYER_ENTER = 0x20;
    const STOC_HS_PLAYER_CHANGE = 0x21;
    const STOC_CATCHUP = 0xf0;
    const STOC_CHAT_2 = 0xf3;
    const CTOS_PLAYER_INFO = 0x10;
    const CTOS_JOIN_GAME = 0x12;
    const CTOS_HS_TOOBSERVER = 0x21;
    const CTOS_HS_START = 0x25;
    const MSG_UPDATE_DATA = 0x06;
    const MSG_UPDATE_CARD = 0x07;
    const MSG_START = 0x04;
    const MSG_SHUFFLE_HAND = 0x21;
    const MSG_NEW_TURN = 0x28;
    const MSG_NEW_PHASE = 0x29;
    const MSG_MOVE = 0x32;
    const MSG_SET = 0x36;
    const MSG_SUMMONING = 0x3c;
    const MSG_SUMMONED = 0x3d;
    const MSG_DRAW = 0x5a;

    const QUERY_FLAGS = {
        QUERY_CODE: 0x1,
        QUERY_POSITION: 0x2,
        QUERY_ALIAS: 0x4,
        QUERY_TYPE: 0x8,
        QUERY_LEVEL: 0x10,
        QUERY_RANK: 0x20,
        QUERY_ATTRIBUTE: 0x40,
        QUERY_RACE: 0x80,
        QUERY_ATTACK: 0x100,
        QUERY_DEFENSE: 0x200,
        QUERY_BASE_ATTACK: 0x400,
        QUERY_BASE_DEFENSE: 0x800,
        QUERY_REASON: 0x1000,
        QUERY_REASON_CARD: 0x2000,
        QUERY_EQUIP_CARD: 0x4000,
        QUERY_TARGET_CARD: 0x8000,
        QUERY_OVERLAY_CARD: 0x10000,
        QUERY_COUNTERS: 0x20000,
        QUERY_OWNER: 0x40000,
        QUERY_STATUS: 0x80000,
        QUERY_IS_PUBLIC: 0x100000,
        QUERY_LSCALE: 0x200000,
        QUERY_RSCALE: 0x400000,
        QUERY_LINK: 0x800000,
        QUERY_IS_HIDDEN: 0x1000000,
        QUERY_COVER: 0x2000000,
        QUERY_END: 0x80000000,
    };

    const LOCATION_NAMES = {
        0x01: 'DECK',
        0x02: 'HAND',
        0x04: 'MZONE',
        0x08: 'SZONE',
        0x10: 'GRAVE',
        0x20: 'REMOVED',
        0x40: 'EXTRA',
        0x80: 'OVERLAY',
        0x0c: 'ONFIELD',
        0x100: 'FZONE',
        0x200: 'PZONE',
    };

    const POSITION_NAMES = {
        0x1: 'FACEUP_ATTACK',
        0x2: 'FACEDOWN_ATTACK',
        0x4: 'FACEUP_DEFENSE',
        0x8: 'FACEDOWN_DEFENSE',
        0x5: 'FACEUP',
        0x0a: 'FACEDOWN',
        0x3: 'ATTACK',
        0x0c: 'DEFENSE',
    };

    const MESSAGE_TYPE_NAMES = {
        [MSG_START]: 'MSG_START',
        [MSG_SHUFFLE_HAND]: 'MSG_SHUFFLE_HAND',
        [MSG_UPDATE_DATA]: 'MSG_UPDATE_DATA',
        [MSG_UPDATE_CARD]: 'MSG_UPDATE_CARD',
        [MSG_NEW_TURN]: 'MSG_NEW_TURN',
        [MSG_NEW_PHASE]: 'MSG_NEW_PHASE',
        [MSG_MOVE]: 'MSG_MOVE',
        [MSG_SET]: 'MSG_SET',
        [MSG_SUMMONING]: 'MSG_SUMMONING',
        [MSG_SUMMONED]: 'MSG_SUMMONED',
        [MSG_DRAW]: 'MSG_DRAW',
    };

    const STOC_TYPE_NAMES = {
        [STOC_GAME_MSG]: 'STOC_GAME_MSG',
        [STOC_JOIN_GAME]: 'STOC_JOIN_GAME',
        [STOC_TYPE_CHANGE]: 'STOC_TYPE_CHANGE',
        [STOC_DUEL_START]: 'STOC_DUEL_START',
        [STOC_HS_PLAYER_ENTER]: 'STOC_HS_PLAYER_ENTER',
        [STOC_HS_PLAYER_CHANGE]: 'STOC_HS_PLAYER_CHANGE',
        [STOC_TIME_LIMIT]: 'STOC_TIME_LIMIT',
        [STOC_CATCHUP]: 'STOC_CATCHUP',
        [STOC_CHAT_2]: 'STOC_CHAT_2',
    };

    const CTOS_TYPE_NAMES = {
        [CTOS_PLAYER_INFO]: 'CTOS_PLAYER_INFO',
        [CTOS_JOIN_GAME]: 'CTOS_JOIN_GAME',
        [CTOS_HS_TOOBSERVER]: 'CTOS_HS_TOOBSERVER',
        [CTOS_HS_START]: 'CTOS_HS_START',
    };

    const PHASE_NAMES = {
        0x01: 'DRAW',
        0x02: 'STANDBY',
        0x04: 'MAIN1',
        0x08: 'BATTLE_START',
        0x10: 'BATTLE_STEP',
        0x20: 'DAMAGE',
        0x40: 'DAMAGE_CAL',
        0x80: 'BATTLE',
        0x100: 'MAIN2',
        0x200: 'END',
    };

    function normalizeHex(input) {
        return String(input || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
    }

    function hexToBytes(hex) {
        const normalized = normalizeHex(hex);
        const bytes = [];
        for (let index = 0; index + 1 < normalized.length; index += 2) {
            bytes.push(parseInt(normalized.slice(index, index + 2), 16));
        }
        return bytes;
    }

    function createReader(source) {
        const bytes = Array.isArray(source) ? source : hexToBytes(source);
        return {
            bytes,
            offset: 0,
            remaining() {
                return Math.max(0, this.bytes.length - this.offset);
            },
            canRead(size) {
                return this.offset + size <= this.bytes.length;
            },
            readUInt8() {
                if (!this.canRead(1)) return null;
                return this.bytes[this.offset++];
            },
            readUInt16LE() {
                if (!this.canRead(2)) return null;
                const value = this.bytes[this.offset] | (this.bytes[this.offset + 1] << 8);
                this.offset += 2;
                return value >>> 0;
            },
            readUInt32LE() {
                if (!this.canRead(4)) return null;
                const b0 = this.bytes[this.offset];
                const b1 = this.bytes[this.offset + 1] << 8;
                const b2 = this.bytes[this.offset + 2] << 16;
                const b3 = this.bytes[this.offset + 3] << 24;
                this.offset += 4;
                return (b0 | b1 | b2 | b3) >>> 0;
            },
            readInt32LE() {
                if (!this.canRead(4)) return null;
                const unsigned = this.readUInt32LE();
                return unsigned > 0x7fffffff ? unsigned - 0x100000000 : unsigned;
            },
            readUInt64LE() {
                if (!this.canRead(8)) return null;
                const low = this.readUInt32LE();
                const high = this.readUInt32LE();
                return (high * 0x100000000) + low;
            },
            readBytes(size) {
                if (!this.canRead(size)) return [];
                const start = this.offset;
                this.offset += size;
                return this.bytes.slice(start, start + size);
            },
        };
    }

    function bytesToHex(bytes) {
        return (bytes || []).map((value) => value.toString(16).padStart(2, '0')).join('');
    }

    function decodeUtf16LeString(bytes) {
        const source = Array.isArray(bytes) ? bytes : [];
        let text = '';
        for (let index = 0; index + 1 < source.length; index += 2) {
            const codeUnit = source[index] | (source[index + 1] << 8);
            if (codeUnit === 0) {
                break;
            }
            text += String.fromCharCode(codeUnit);
        }
        return text.replace(/\u0000+$/g, '').trim();
    }

    function extractUtf16LeText(bytes, minChars = 3) {
        const source = Array.isArray(bytes) ? bytes : [];
        for (let start = 0; start + 1 < source.length; start += 1) {
            if (source[start] === 0 || source[start + 1] !== 0) {
                continue;
            }
            let end = start;
            let printableCount = 0;
            while (end + 1 < source.length) {
                const low = source[end];
                const high = source[end + 1];
                if (high !== 0 || low === 0) {
                    break;
                }
                if (low >= 0x20 && low <= 0x7e) {
                    printableCount += 1;
                }
                end += 2;
            }
            if (printableCount >= minChars) {
                return decodeUtf16LeString(source.slice(start, end));
            }
        }
        return '';
    }

    function playerRoomStateName(stateCode) {
        switch (Number(stateCode)) {
            case 0x08: return 'SPECTATE';
            case 0x09: return 'READY';
            case 0x0a: return 'NOT_READY';
            case 0x0b: return 'LEAVE';
            default: return null;
        }
    }

    function getLocationName(location) {
        if (typeof location === 'string' && location.trim()) {
            return location;
        }
        return LOCATION_NAMES[Number(location)] || ('LOCATION_0x' + Number(location || 0).toString(16).toUpperCase());
    }

    function getPositionName(position) {
        return POSITION_NAMES[Number(position)] || ('POS_0x' + Number(position || 0).toString(16).toUpperCase());
    }

    function isFaceDownPosition(position) {
        const numeric = Number(position);
        if (!Number.isFinite(numeric)) return false;
        return ((numeric >>> 0) & 0x0a) !== 0;
    }

    function inferCardPresence(cardLike) {
        const card = cardLike || {};
        const hasVisibleFields = [
            card.code,
            card.position,
            card.attack,
            card.defense,
            card.level,
            card.rank,
            card.cardType,
            card.attribute,
            card.race,
            card.owner,
            card.status,
        ].some((value) => value !== null && value !== undefined);
        const hasFlags = Number(card.flags || 0) !== 0;
        const isFaceDown = isFaceDownPosition(card.position);
        const isEmpty = !hasVisibleFields && !hasFlags && !!card.onfieldSkipped;

        if (isEmpty) {
            return {
                isOccupied: false,
                isFaceDown: false,
                isEmpty: true,
                cardState: 'empty',
                cardStateLabel: 'sin carta',
            };
        }

        if (isFaceDown) {
            return {
                isOccupied: true,
                isFaceDown: true,
                isEmpty: false,
                cardState: 'occupied_facedown',
                cardStateLabel: 'carta boca abajo',
            };
        }

        if (hasVisibleFields || hasFlags) {
            return {
                isOccupied: true,
                isFaceDown: false,
                isEmpty: false,
                cardState: 'occupied_visible',
                cardStateLabel: 'carta presente o visible',
            };
        }

        return {
            isOccupied: true,
            isFaceDown: false,
            isEmpty: false,
            cardState: 'occupied_unknown',
            cardStateLabel: 'carta presente sin detalle',
        };
    }

    function getQueryFlagName(flag) {
        const entry = Object.entries(QUERY_FLAGS).find(([, value]) => value === flag);
        return entry ? entry[0] : ('QUERY_0x' + Number(flag || 0).toString(16).toUpperCase());
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
            locationName: getLocationName(location),
            sequence,
            position,
            positionName: getPositionName(position),
        };
    }

    function parseQueryBlockPayload(flag, payloadBytes) {
        const reader = createReader(payloadBytes);
        switch (flag) {
            case QUERY_FLAGS.QUERY_CODE:
                return { code: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_POSITION:
                return { position: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_ALIAS:
                return { alias: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_TYPE:
                return { cardType: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_LEVEL:
                return { level: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_RANK:
                return { rank: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_ATTRIBUTE:
                return { attribute: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_RACE:
                return { race: payloadBytes.length >= 8 ? reader.readUInt64LE() : reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_ATTACK:
                return { attack: reader.readInt32LE() };
            case QUERY_FLAGS.QUERY_DEFENSE:
                return { defense: reader.readInt32LE() };
            case QUERY_FLAGS.QUERY_BASE_ATTACK:
                return { baseAttack: reader.readInt32LE() };
            case QUERY_FLAGS.QUERY_BASE_DEFENSE:
                return { baseDefense: reader.readInt32LE() };
            case QUERY_FLAGS.QUERY_REASON:
                return { reason: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_OWNER:
                return { owner: reader.readUInt8() };
            case QUERY_FLAGS.QUERY_STATUS:
                return { status: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_IS_PUBLIC:
                return { isPublic: reader.readUInt8() };
            case QUERY_FLAGS.QUERY_LSCALE:
                return { lscale: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_RSCALE:
                return { rscale: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_IS_HIDDEN:
                return { isHidden: reader.readUInt8() };
            case QUERY_FLAGS.QUERY_COVER:
                return { cover: reader.readUInt32LE() };
            case QUERY_FLAGS.QUERY_REASON_CARD:
                return { reasonCard: parseLocInfo(reader) };
            case QUERY_FLAGS.QUERY_EQUIP_CARD:
                return { equipCard: parseLocInfo(reader) };
            case QUERY_FLAGS.QUERY_TARGET_CARD: {
                const count = reader.readUInt32LE() || 0;
                const targetCards = [];
                for (let index = 0; index < Math.min(count, 256); index += 1) {
                    const info = parseLocInfo(reader);
                    if (!info) break;
                    targetCards.push(info);
                }
                return { targetCards };
            }
            case QUERY_FLAGS.QUERY_OVERLAY_CARD: {
                const count = reader.readUInt32LE() || 0;
                const overlayCards = [];
                for (let index = 0; index < Math.min(count, 256); index += 1) {
                    const code = reader.readUInt32LE();
                    if (code === null || code === undefined) break;
                    overlayCards.push(code);
                }
                return { overlayCards };
            }
            case QUERY_FLAGS.QUERY_COUNTERS: {
                const count = reader.readUInt32LE() || 0;
                const counters = [];
                for (let index = 0; index < Math.min(count, 256); index += 1) {
                    const counter = reader.readUInt32LE();
                    if (counter === null || counter === undefined) break;
                    counters.push(counter);
                }
                return { counters };
            }
            case QUERY_FLAGS.QUERY_LINK:
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
            blocks: [],
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
        while (reader.remaining() >= 2 && blockCount < 128) {
            const blockOffset = reader.offset;
            const blockSize = reader.readUInt16LE();
            if (blockSize === null || blockSize === undefined) {
                break;
            }

            if (blockSize === 0) {
                result.onfieldSkipped = true;
                break;
            }

            const flag = reader.readUInt32LE();
            if (flag === null || flag === undefined) {
                break;
            }

            const payloadSize = Math.max(0, blockSize - 4);
            if (!reader.canRead(payloadSize)) {
                result.truncated = true;
                break;
            }
            const payloadBytes = reader.readBytes(payloadSize);
            const parsed = parseQueryBlockPayload(flag, payloadBytes);

            const block = {
                offset: blockOffset,
                size: payloadSize + 6,
                blockSize,
                flag,
                flagName: getQueryFlagName(flag),
                payloadHex: bytesToHex(payloadBytes),
                parsed,
            };
            result.blocks.push(block);
            result.flags = (result.flags | flag) >>> 0;

            Object.assign(result, Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)));

            blockCount += 1;
            if (flag === QUERY_FLAGS.QUERY_END) {
                break;
            }
        }

        result.blockCount = blockCount;
        result.bytesRead = Math.max(0, reader.offset - startOffset);
        return result;
    }

    function parseUpdateDataPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 6) return null;

        const player = reader.readUInt8();
        const location = reader.readUInt8();
        const totalSize = reader.readUInt32LE();
        const queryStreamStart = reader.offset;
        const bytesBudget = Math.min(Number(totalSize || 0), reader.remaining());
        const budgetEnd = queryStreamStart + bytesBudget;
        const cards = [];
        let sequence = 0;

        while (reader.offset < budgetEnd && reader.remaining() >= 2 && cards.length < 512) {
            const cardOffset = reader.offset;
            const query = parseQuery(reader);
            const consumed = reader.offset - cardOffset;
            if (consumed <= 0) break;

            cards.push({
                sequence,
                offset: cardOffset,
                bytesRead: consumed,
                ...query,
                positionName: query.position !== null && query.position !== undefined ? getPositionName(query.position) : null,
                ...inferCardPresence(query),
            });

            sequence += 1;
            if (query.truncated || query.noProgress) break;
        }

        return {
            type: 'MSG_UPDATE_DATA',
            rawType: MSG_UPDATE_DATA,
            payloadHex: normalizedHex,
            player,
            location,
            locationName: getLocationName(location),
            totalSize,
            queryStreamStart,
            bytesBudget,
            cards,
            cardCount: cards.length,
        };
    }

    function parseUpdateCardPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 3) return null;

        const player = reader.readUInt8();
        const location = reader.readUInt8();
        const sequence = reader.readUInt8();
        const query = parseQuery(reader);

        return {
            type: 'MSG_UPDATE_CARD',
            rawType: MSG_UPDATE_CARD,
            payloadHex: normalizedHex,
            player,
            location,
            locationName: getLocationName(location),
            sequence,
            positionName: query.position !== null && query.position !== undefined ? getPositionName(query.position) : null,
            ...query,
            ...inferCardPresence(query),
        };
    }

    function parseNewPhasePayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 2) return null;
        const phase = reader.readUInt16LE();
        return {
            type: 'MSG_NEW_PHASE',
            rawType: MSG_NEW_PHASE,
            payloadHex: normalizedHex,
            phase,
            phaseName: PHASE_NAMES[Number(phase)] || ('PHASE_0x' + Number(phase || 0).toString(16).toUpperCase()),
        };
    }

    function parseNewTurnPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 1) return null;
        const player = reader.readUInt8();
        return {
            type: 'MSG_NEW_TURN',
            rawType: MSG_NEW_TURN,
            payloadHex: normalizedHex,
            player,
        };
    }

    function parseStartPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 12) return null;
        const lp0 = reader.readUInt32LE();
        const lp1 = reader.readUInt32LE();
        const deck0 = reader.readUInt16LE();
        const deck1 = reader.readUInt16LE();
        const extra0 = reader.readUInt16LE();
        const extra1 = reader.readUInt16LE();
        return {
            type: 'MSG_START',
            rawType: MSG_START,
            payloadHex: normalizedHex,
            playerLp: [lp0, lp1],
            deckSizes: [deck0, deck1],
            extraSizes: [extra0, extra1],
        };
    }

    function parseDrawPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 2) return null;
        const player = reader.readUInt8();
        const count = reader.readUInt8();
        const cards = [];
        while (reader.remaining() >= 4 && cards.length < Math.max(count, 16)) {
            cards.push(reader.readUInt32LE());
        }
        return {
            type: 'MSG_DRAW',
            rawType: MSG_DRAW,
            payloadHex: normalizedHex,
            player,
            count,
            cards,
        };
    }

    function parseShuffleHandPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 1) return null;
        const player = reader.readUInt8();
        return {
            type: 'MSG_SHUFFLE_HAND',
            rawType: MSG_SHUFFLE_HAND,
            payloadHex: normalizedHex,
            player,
        };
    }

    function parseSetPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 8) return null;
        const code = reader.readUInt32LE();
        const controller = reader.readUInt8();
        const location = reader.readUInt8();
        const sequence = reader.readUInt32LE();
        const position = reader.readUInt32LE();
        return {
            type: 'MSG_SET',
            rawType: MSG_SET,
            payloadHex: normalizedHex,
            code,
            currentController: controller,
            currentLocation: location,
            currentLocationName: getLocationName(location),
            currentSequence: sequence,
            currentPosition: position,
            currentPositionName: getPositionName(position),
        };
    }

    function parseSummonPayloadHex(payloadHex, messageType) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 8) return null;
        const code = reader.readUInt32LE();
        const controller = reader.readUInt8();
        const location = reader.readUInt8();
        const sequence = reader.readUInt32LE();
        const position = reader.readUInt32LE();
        return {
            type: messageType === MSG_SUMMONING ? 'MSG_SUMMONING' : 'MSG_SUMMONED',
            rawType: messageType,
            payloadHex: normalizedHex,
            code,
            controller,
            location,
            locationName: getLocationName(location),
            sequence,
            position,
            positionName: getPositionName(position),
        };
    }

    function parsePlayerEnterPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const bytes = hexToBytes(normalizedHex);
        return {
            type: 'waiting_player_enter',
            payloadHex: normalizedHex,
            name: decodeUtf16LeString(bytes.slice(0, 40)),
            position: bytes.length > 40 ? bytes[40] : null,
        };
    }

    function parsePlayerChangePayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const bytes = hexToBytes(normalizedHex);
        const status = bytes.length > 0 ? bytes[0] : null;
        const position = status === null ? null : (status >> 4);
        const stateCode = status === null ? null : (status & 0x0f);
        const stateName = playerRoomStateName(stateCode);
        return {
            type: 'waiting_player_change',
            payloadHex: normalizedHex,
            status,
            rawStatus: status,
            position,
            stateCode,
            stateName,
            isLobbyState: stateName !== null,
        };
    }

    function parseChat2PayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const bytes = hexToBytes(normalizedHex);
        return {
            type: 'stoc_chat_2',
            payloadHex: normalizedHex,
            subtype: bytes.length > 0 ? bytes[0] : null,
            text: extractUtf16LeText(bytes.slice(1)),
        };
    }

    function parseTimeLimitPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 3) return null;
        const player = reader.readUInt8();
        const leftTime = reader.readUInt16LE();
        return {
            type: 'time_limit',
            payloadHex: normalizedHex,
            player,
            leftTime,
        };
    }

    function parseTypeChangePayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const bytes = hexToBytes(normalizedHex);
        const value = bytes.length > 0 ? bytes[0] : null;
        return {
            type: 'waiting_type_change',
            payloadHex: normalizedHex,
            typeValue: value,
            hostFlag: value === null ? null : ((value & 0xf0) >>> 4),
            slot: value === null ? null : (value & 0x0f),
        };
    }

    function parseDuelStartPayloadHex(payloadHex) {
        return {
            type: 'duel_start',
            payloadHex: normalizeHex(payloadHex),
        };
    }

    function parseCatchupPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const bytes = hexToBytes(normalizedHex);
        return {
            type: 'catchup_state',
            payloadHex: normalizedHex,
            catchupCode: bytes.length > 0 ? bytes[0] : null,
        };
    }

    function parseJoinGamePayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 42) {
            return {
                type: 'stoc_join_game',
                payloadHex: normalizedHex,
            };
        }
        const lflist = reader.readUInt32LE();
        const rule = reader.readUInt8();
        const mode = reader.readUInt8();
        const duelRule = reader.readUInt8();
        const noCheckDeckContent = reader.readUInt8();
        const noShuffleDeck = reader.readUInt8();
        const paddingHex = bytesToHex(reader.readBytes(3));
        const startLp = reader.readUInt32LE();
        const startHand = reader.readUInt8();
        const drawCount = reader.readUInt8();
        const timeLimit = reader.readUInt16LE();
        const duelFlagHigh = reader.readUInt32LE();
        const handshake = reader.readUInt32LE();
        const version = reader.readUInt32LE();
        const team0Count = reader.readUInt32LE();
        const team1Count = reader.readUInt32LE();
        const bestOf = reader.readUInt32LE();
        const duelFlagLow = reader.readUInt32LE();
        const forbiddenTypes = reader.readUInt32LE();
        const extraRules = reader.readUInt16LE();
        const mainDeckMin = reader.readUInt16LE();
        const mainDeckMax = reader.readUInt16LE();
        const extraDeckMin = reader.readUInt16LE();
        const extraDeckMax = reader.readUInt16LE();
        const sideDeckMin = reader.readUInt16LE();
        const sideDeckMax = reader.readUInt16LE();
        const trailerHex = bytesToHex(reader.readBytes(reader.remaining()));
        return {
            type: 'stoc_join_game',
            payloadHex: normalizedHex,
            lflist,
            rule,
            mode,
            duelRule,
            noCheckDeckContent,
            noShuffleDeck,
            paddingHex,
            startLp,
            startHand,
            drawCount,
            timeLimit,
            duelFlagHigh,
            handshake,
            version,
            team0Count,
            team1Count,
            bestOf,
            duelFlagLow,
            forbiddenTypes,
            extraRules,
            deckSizes: {
                mainMin: mainDeckMin,
                mainMax: mainDeckMax,
                extraMin: extraDeckMin,
                extraMax: extraDeckMax,
                sideMin: sideDeckMin,
                sideMax: sideDeckMax,
            },
            trailerHex,
        };
    }

    function parseCtosPlayerInfoPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const bytes = hexToBytes(normalizedHex);
        return {
            type: 'ctos_player_info',
            payloadHex: normalizedHex,
            name: decodeUtf16LeString(bytes),
        };
    }

    function parseCtosJoinGamePayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 4) {
            return {
                type: 'ctos_join_game',
                payloadHex: normalizedHex,
            };
        }
        const version = reader.readUInt16LE();
        const gameId = reader.readUInt32LE();
        return {
            type: 'ctos_join_game',
            payloadHex: normalizedHex,
            version,
            gameId,
        };
    }

    function parseCtosSimplePayloadHex(payloadHex, type) {
        return {
            type,
            payloadHex: normalizeHex(payloadHex),
        };
    }

    function parseMoveCompactPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() !== 16) return null;
        const code = reader.readUInt32LE();
        const previousController = reader.readUInt8();
        const previousLocation = reader.readUInt8();
        const previousSequence = reader.readUInt8();
        const previousPosition = reader.readUInt8();
        const currentController = reader.readUInt8();
        const currentLocation = reader.readUInt8();
        const currentSequence = reader.readUInt8();
        const currentPosition = reader.readUInt8();
        const reason = reader.readUInt32LE();

        return {
            type: 'MSG_MOVE',
            rawType: MSG_MOVE,
            payloadHex: normalizedHex,
            code,
            previousController,
            previousLocation,
            previousLocationName: getLocationName(previousLocation),
            previousSequence,
            previousPosition,
            previousPositionName: getPositionName(previousPosition),
            currentController,
            currentLocation,
            currentLocationName: getLocationName(currentLocation),
            currentSequence,
            currentPosition,
            currentPositionName: getPositionName(currentPosition),
            reason,
            parserVariant: 'compact',
        };
    }

    function parseMoveExtendedPayloadHex(payloadHex) {
        const normalizedHex = normalizeHex(payloadHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() !== 28) return null;
        const code = reader.readUInt32LE();
        const previous = parseLocInfo(reader);
        const current = parseLocInfo(reader);
        const reason = reader.readUInt32LE();
        if (!previous || !current) return null;

        return {
            type: 'MSG_MOVE',
            rawType: MSG_MOVE,
            payloadHex: normalizedHex,
            code,
            previousController: previous.controller,
            previousLocation: previous.location,
            previousLocationName: previous.locationName,
            previousSequence: previous.sequence,
            previousPosition: previous.position,
            previousPositionName: previous.positionName,
            currentController: current.controller,
            currentLocation: current.location,
            currentLocationName: current.locationName,
            currentSequence: current.sequence,
            currentPosition: current.position,
            currentPositionName: current.positionName,
            reason,
            parserVariant: 'extended',
        };
    }

    function parseMovePayloadHex(payloadHex) {
        return parseMoveCompactPayloadHex(payloadHex) || parseMoveExtendedPayloadHex(payloadHex);
    }

    function inferRawTypeFromHint(hint) {
        const text = String(hint || '').toUpperCase();
        if (text.includes('MSG_UPDATE_DATA')) return MSG_UPDATE_DATA;
        if (text.includes('MSG_UPDATE_CARD')) return MSG_UPDATE_CARD;
        if (text.includes('MSG_START')) return MSG_START;
        if (text.includes('MSG_SHUFFLE_HAND')) return MSG_SHUFFLE_HAND;
        if (text.includes('MSG_NEW_TURN')) return MSG_NEW_TURN;
        if (text.includes('MSG_NEW_PHASE')) return MSG_NEW_PHASE;
        if (text.includes('MSG_MOVE')) return MSG_MOVE;
        if (text.includes('MSG_SET')) return MSG_SET;
        if (text.includes('MSG_SUMMONING')) return MSG_SUMMONING;
        if (text.includes('MSG_SUMMONED')) return MSG_SUMMONED;
        if (text.includes('MSG_DRAW')) return MSG_DRAW;
        return null;
    }

    function decodeGamePayloadHex(rawType, payloadHex, meta) {
        let parsed = null;
        if (Number(rawType) === MSG_START) {
            parsed = parseStartPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_DRAW) {
            parsed = parseDrawPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_SHUFFLE_HAND) {
            parsed = parseShuffleHandPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_UPDATE_DATA) {
            parsed = parseUpdateDataPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_UPDATE_CARD) {
            parsed = parseUpdateCardPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_NEW_TURN) {
            parsed = parseNewTurnPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_NEW_PHASE) {
            parsed = parseNewPhasePayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_MOVE) {
            parsed = parseMovePayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_SET) {
            parsed = parseSetPayloadHex(payloadHex);
        } else if (Number(rawType) === MSG_SUMMONING || Number(rawType) === MSG_SUMMONED) {
            parsed = parseSummonPayloadHex(payloadHex, Number(rawType));
            if (!parsed && Number(rawType) === MSG_SUMMONED && !normalizeHex(payloadHex)) {
                parsed = {
                    type: 'MSG_SUMMONED',
                    rawType: MSG_SUMMONED,
                    payloadHex: '',
                };
            }
        }

        if (!parsed) {
            return {
                ok: false,
                rawType: Number(rawType),
                type: MESSAGE_TYPE_NAMES[Number(rawType)] || null,
                payloadHex: normalizeHex(payloadHex),
                source: meta && meta.source ? meta.source : 'payload',
            };
        }

        return {
            ok: true,
            source: meta && meta.source ? meta.source : 'payload',
            stocType: meta && meta.stocType !== undefined ? meta.stocType : null,
            stocName: meta && meta.stocName ? meta.stocName : null,
            rawType: Number(rawType),
            type: parsed.type,
            payloadHex: parsed.payloadHex,
            decoded: parsed,
            replayPayload: {
                ...parsed,
            },
            summary: buildSummary(parsed),
        };
    }

    function decodeStocGameMsgHex(segmentHex) {
        const normalizedHex = normalizeHex(segmentHex);
        const reader = createReader(normalizedHex);
        if (reader.remaining() < 4) {
            return { ok: false, source: 'stoc_game_msg', payloadHex: '' };
        }

        const packetSize = reader.readUInt16LE();
        const stocType = reader.readUInt8();
        const rawType = reader.readUInt8();
        const payloadBytes = reader.readBytes(reader.remaining());
        const payloadHex = bytesToHex(payloadBytes);

        if (stocType !== STOC_GAME_MSG) {
            return {
                ok: false,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                payloadHex,
            };
        }

        const decoded = decodeGamePayloadHex(rawType, payloadHex, {
            source: 'stoc_game_msg',
            stocType,
            stocName: 'STOC_GAME_MSG',
        });

        decoded.packetSize = packetSize;
        decoded.segmentHex = normalizedHex;
        return decoded;
    }

    function splitTransportSegments(frameHex) {
        const normalizedHex = normalizeHex(frameHex);
        const reader = createReader(normalizedHex);
        const segments = [];
        let segmentIndex = 0;

        while (reader.remaining() >= 2) {
            const startOffset = reader.offset;
            const packetSize = reader.readUInt16LE();
            if (packetSize === null || packetSize === undefined) {
                break;
            }
            if (packetSize <= 0) {
                break;
            }

            const totalBytes = packetSize + 2;
            const payloadBytes = totalBytes - 2;
            if (payloadBytes < 0 || !reader.canRead(payloadBytes)) {
                break;
            }

            const segmentBytes = reader.bytes.slice(startOffset, startOffset + totalBytes);
            const segmentHex = bytesToHex(segmentBytes);
            const stocType = segmentBytes.length >= 3 ? segmentBytes[2] : null;
            const rawType = segmentBytes.length >= 4 ? segmentBytes[3] : null;

            segments.push({
                segmentIndex,
                startOffset,
                totalBytes,
                packetSize,
                stocType,
                rawType,
                hex: segmentHex,
            });

            reader.offset = startOffset + totalBytes;
            segmentIndex += 1;
        }

        return segments;
    }

    function decodeTransportSegment(segment) {
        const segmentHex = normalizeHex(segment && segment.hex ? segment.hex : segment);
        const bytes = hexToBytes(segmentHex);
        const packetSize = bytes.length >= 2 ? (bytes[0] | (bytes[1] << 8)) : null;
        const stocType = bytes.length >= 3 ? bytes[2] : null;
        const rawType = bytes.length >= 4 ? bytes[3] : null;

        if (!bytes.length) {
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: 'transport_empty',
                payloadHex: '',
                normalizedMessage: {
                    type: 'transport_empty',
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        type: 'transport_empty',
                        payloadHex: '',
                    },
                },
            };
        }

        if (packetSize !== null && packetSize <= 0) {
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: 'transport_padding',
                payloadHex: segmentHex.slice(4),
                normalizedMessage: {
                    type: 'transport_padding',
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        type: 'transport_padding',
                        packetSize,
                        payloadHex: segmentHex.slice(4),
                    },
                },
            };
        }

        if (stocType === STOC_GAME_MSG) {
            const decoded = decodeStocGameMsgHex(segmentHex);
            if (decoded && decoded.ok) {
                return {
                    ...decoded,
                    packetSize,
                    stocType,
                    rawType,
                    normalizedMessage: {
                        type: decoded.type,
                        hex: segmentHex,
                        raw: segmentHex,
                        payload: decoded.replayPayload,
                    },
                };
            }
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: 'game_msg',
                payloadHex: segmentHex.slice(8),
                normalizedMessage: {
                    type: 'game_msg',
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        type: 'game_msg',
                        rawType,
                        payloadHex: segmentHex.slice(8),
                    },
                },
            };
        }

        if (stocType === STOC_TIME_LIMIT) {
            const payloadHex = segmentHex.slice(6);
            const payload = parseTimeLimitPayloadHex(payloadHex) || {
                type: 'time_limit',
                payloadHex,
            };
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload,
                },
            };
        }

        if (stocType === STOC_JOIN_GAME) {
            const payloadHex = segmentHex.slice(6);
            const payload = parseJoinGamePayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_JOIN_GAME],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        if (stocType === STOC_TYPE_CHANGE) {
            const payloadHex = segmentHex.slice(6);
            const payload = parseTypeChangePayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_TYPE_CHANGE],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        if (stocType === STOC_DUEL_START) {
            const payloadHex = segmentHex.slice(6);
            const payload = parseDuelStartPayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_DUEL_START],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        if (stocType === STOC_CATCHUP) {
            const payloadHex = segmentHex.slice(6);
            const payload = parseCatchupPayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_CATCHUP],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        if (stocType === STOC_HS_PLAYER_ENTER) {
            const payloadHex = segmentHex.slice(6);
            const payload = parsePlayerEnterPayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_HS_PLAYER_ENTER],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        if (stocType === STOC_HS_PLAYER_CHANGE) {
            const payloadHex = segmentHex.slice(6);
            const payload = parsePlayerChangePayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_HS_PLAYER_CHANGE],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        if (stocType === STOC_CHAT_2) {
            const payloadHex = segmentHex.slice(6);
            const payload = parseChat2PayloadHex(payloadHex);
            return {
                ok: true,
                source: 'segment',
                packetSize,
                stocType,
                rawType,
                type: payload.type,
                payloadHex,
                normalizedMessage: {
                    type: payload.type,
                    hex: segmentHex,
                    raw: segmentHex,
                    payload: {
                        ...payload,
                        messageName: STOC_TYPE_NAMES[STOC_CHAT_2],
                        stocType,
                        rawType,
                    },
                },
            };
        }

        const stocName = STOC_TYPE_NAMES[Number(stocType)] || `STOC_0x${Number(stocType || 0).toString(16).toUpperCase()}`;

        return {
            ok: true,
            source: 'segment',
            packetSize,
            stocType,
            rawType,
            type: 'socket_segment',
            payloadHex: stocType === null ? '' : segmentHex.slice(6),
            normalizedMessage: {
                type: 'socket_segment',
                hex: segmentHex,
                raw: segmentHex,
                payload: {
                    type: 'socket_segment',
                    messageName: stocName,
                    stocType,
                    rawType,
                    payloadHex: stocType === null ? '' : segmentHex.slice(6),
                },
            },
        };
    }

    function buildSummary(parsed) {
        if (!parsed || !parsed.type) return '';
        if (parsed.type === 'MSG_UPDATE_DATA') {
            return `${parsed.type} | player=${parsed.player} | location=${parsed.locationName} | cards=${parsed.cardCount}`;
        }
        if (parsed.type === 'MSG_START') {
            return `${parsed.type} | lp=${parsed.playerLp?.join('/') || '-'}`;
        }
        if (parsed.type === 'MSG_DRAW') {
            return `${parsed.type} | player=${parsed.player} | count=${parsed.count}`;
        }
        if (parsed.type === 'MSG_UPDATE_CARD') {
            return `${parsed.type} | player=${parsed.player} | location=${parsed.locationName} | sequence=${parsed.sequence}`;
        }
        if (parsed.type === 'MSG_SHUFFLE_HAND') {
            return `${parsed.type} | player=${parsed.player}`;
        }
        if (parsed.type === 'MSG_NEW_TURN') {
            return `${parsed.type} | player=${parsed.player}`;
        }
        if (parsed.type === 'MSG_NEW_PHASE') {
            return `${parsed.type} | phase=${parsed.phaseName}`;
        }
        if (parsed.type === 'MSG_MOVE') {
            return `${parsed.type} | ${parsed.previousLocationName}:${parsed.previousSequence} -> ${parsed.currentLocationName}:${parsed.currentSequence}`;
        }
        if (parsed.type === 'MSG_SET') {
            return `${parsed.type} | ${parsed.currentLocationName}:${parsed.currentSequence}`;
        }
        if (parsed.type === 'MSG_SUMMONING' || parsed.type === 'MSG_SUMMONED') {
            return `${parsed.type} | ${parsed.locationName}:${parsed.sequence}`;
        }
        if (parsed.type === 'waiting_player_enter') {
            return `${parsed.type} | pos=${parsed.position} | name=${parsed.name || '-'}`;
        }
        if (parsed.type === 'waiting_player_change') {
            return `${parsed.type} | pos=${parsed.position} | state=${parsed.stateName || parsed.stateCode || '-'}`;
        }
        if (parsed.type === 'stoc_chat_2') {
            return `${parsed.type} | ${parsed.text || '(sin texto)'}`;
        }
        if (parsed.type === 'time_limit') {
            return `${parsed.type} | player=${parsed.player} | left=${parsed.leftTime}`;
        }
        if (parsed.type === 'waiting_type_change') {
            return `${parsed.type} | raw=${parsed.typeValue} | slot=${parsed.slot}`;
        }
        if (parsed.type === 'duel_start' || parsed.type === 'catchup_state') {
            return parsed.type;
        }
        if (parsed.type === 'stoc_join_game') {
            return `${parsed.type} | lp=${parsed.startLp ?? '-'} | hand=${parsed.startHand ?? '-'} | draw=${parsed.drawCount ?? '-'}`;
        }
        if (parsed.type === 'ctos_player_info') {
            return `${parsed.type} | name=${parsed.name || '-'}`;
        }
        if (parsed.type === 'ctos_join_game') {
            return `${parsed.type} | gameId=${parsed.gameId ?? '-'} | version=${parsed.version ?? '-'}`;
        }
        if (parsed.type === 'ctos_to_observer' || parsed.type === 'ctos_hs_start') {
            return parsed.type;
        }
        if (parsed.type === 'transport_empty' || parsed.type === 'transport_padding') {
            return parsed.type;
        }
        return parsed.type;
    }

    function normalizePayloadObject(payload) {
        if (!payload || !payload.type) return null;
        if (
            payload.type !== 'MSG_UPDATE_DATA' &&
            payload.type !== 'MSG_UPDATE_CARD' &&
            payload.type !== 'MSG_NEW_TURN' &&
            payload.type !== 'MSG_NEW_PHASE' &&
            payload.type !== 'MSG_MOVE'
        ) {
            return payload;
        }

        const payloadHex = normalizeHex(payload.payloadHex || payload.queryHex || '');
        let parsed = null;
        if (payload.type === 'MSG_UPDATE_DATA') {
            parsed = payloadHex ? parseUpdateDataPayloadHex(payloadHex) : null;
        } else if (payload.type === 'MSG_UPDATE_CARD') {
            parsed = payloadHex ? parseUpdateCardPayloadHex(payloadHex) : null;
        } else if (payload.type === 'MSG_NEW_TURN') {
            parsed = payloadHex ? parseNewTurnPayloadHex(payloadHex) : null;
        } else if (payload.type === 'MSG_NEW_PHASE') {
            parsed = payloadHex ? parseNewPhasePayloadHex(payloadHex) : null;
        } else if (payload.type === 'MSG_MOVE') {
            parsed = payloadHex ? parseMovePayloadHex(payloadHex) : null;
        }

        return {
            ...(parsed || {}),
            ...payload,
            payloadHex: payloadHex || payload.payloadHex || '',
        };
    }

    function decodeMessageRecord(messageRecord) {
        const record = messageRecord || {};
        const recordHex = normalizeHex(record.hex || record.raw || '');
        if ((record.type === 'socket_segment' || record.type === 'socket_unhandled' || record.type === 'socket_buffer_pending') && recordHex) {
            const transportDecoded = decodeTransportSegment(recordHex);
            if (transportDecoded?.ok && transportDecoded?.normalizedMessage?.payload) {
                return {
                    ...transportDecoded,
                    normalizedMessage: {
                        ...record,
                        type: transportDecoded.type || record.type,
                        payload: transportDecoded.normalizedMessage.payload,
                        raw: record.raw || recordHex,
                        hex: record.hex || recordHex,
                    },
                };
            }
        }
        if (record.type === 'socket_send' && recordHex) {
            const bytes = hexToBytes(recordHex);
            const packetSize = bytes.length >= 2 ? (bytes[0] | (bytes[1] << 8)) : null;
            const ctosType = bytes.length >= 3 ? bytes[2] : null;
            const payloadHex = recordHex.slice(6);
            let payload = null;
            if (ctosType === CTOS_PLAYER_INFO) payload = parseCtosPlayerInfoPayloadHex(payloadHex);
            else if (ctosType === CTOS_JOIN_GAME) payload = parseCtosJoinGamePayloadHex(payloadHex);
            else if (ctosType === CTOS_HS_TOOBSERVER) payload = parseCtosSimplePayloadHex(payloadHex, 'ctos_to_observer');
            else if (ctosType === CTOS_HS_START) payload = parseCtosSimplePayloadHex(payloadHex, 'ctos_hs_start');
            if (payload) {
                return {
                    ok: true,
                    source: 'record',
                    rawType: ctosType,
                    type: payload.type,
                    payloadHex,
                    decoded: payload,
                    replayPayload: payload,
                    normalizedMessage: {
                        ...record,
                        payload: {
                            ...payload,
                            packetSize,
                            ctosType,
                            messageName: CTOS_TYPE_NAMES[ctosType] || null,
                        },
                    },
                    summary: buildSummary(payload),
                };
            }
        }
        const normalizedPayload = normalizePayloadObject(record.payload);
        if (
            normalizedPayload &&
            normalizedPayload.type &&
            (
                normalizedPayload.type === 'MSG_UPDATE_DATA' ||
                normalizedPayload.type === 'MSG_UPDATE_CARD' ||
                normalizedPayload.type === 'MSG_START' ||
                normalizedPayload.type === 'MSG_DRAW' ||
                normalizedPayload.type === 'MSG_SHUFFLE_HAND' ||
                normalizedPayload.type === 'MSG_NEW_TURN' ||
                normalizedPayload.type === 'MSG_NEW_PHASE' ||
                normalizedPayload.type === 'MSG_MOVE' ||
                normalizedPayload.type === 'MSG_SET' ||
                normalizedPayload.type === 'MSG_SUMMONING' ||
                normalizedPayload.type === 'MSG_SUMMONED'
            )
        ) {
            return {
                ok: true,
                source: 'payload',
                rawType: inferRawTypeFromHint(normalizedPayload.type),
                type: normalizedPayload.type,
                payloadHex: normalizeHex(normalizedPayload.payloadHex || ''),
                decoded: normalizedPayload,
                replayPayload: normalizedPayload,
                normalizedMessage: {
                    ...record,
                    payload: normalizedPayload,
                },
                summary: buildSummary(normalizedPayload),
            };
        }

        const typeHint = [record.type, record.line, record.description].filter(Boolean).join(' | ');
        const hex = recordHex;
        if (!hex) {
            return {
                ok: false,
                source: 'record',
                normalizedMessage: { ...record },
            };
        }

        let decoded = null;
        const inferredRawType = inferRawTypeFromHint(typeHint);

        if (hex.length >= 8) {
            const stocCandidate = hexToBytes(hex).slice(0, 4);
            if (stocCandidate[2] === STOC_GAME_MSG) {
                decoded = decodeStocGameMsgHex(hex);
            }
        }

        if ((!decoded || !decoded.ok) && inferredRawType !== null) {
            decoded = decodeGamePayloadHex(inferredRawType, hex, { source: 'payload' });
        }

        if (!decoded || !decoded.ok) {
            return {
                ok: false,
                source: 'record',
                normalizedMessage: { ...record },
            };
        }

        return {
            ...decoded,
            normalizedMessage: {
                ...record,
                type: decoded.type || record.type,
                payload: decoded.replayPayload,
                raw: record.raw || hex,
                hex: record.hex || hex,
            },
        };
    }

    function expandMessageRecord(messageRecord) {
        const record = messageRecord || {};
        const textHint = [record.type, record.line, record.description].filter(Boolean).join(' | ').toUpperCase();
        const hex = normalizeHex(record.hex || record.raw || '');
        if (!hex) {
            return [record];
        }

        const isSocketFrame = record.type === 'socket_frame' || textHint.includes('SOCKET IN FRAME');
        if (!isSocketFrame) {
            const decoded = decodeMessageRecord(record);
            return [decoded?.normalizedMessage || record];
        }

        const segments = splitTransportSegments(hex);
        if (!segments.length) {
            const decoded = decodeMessageRecord(record);
            return [decoded?.normalizedMessage || record];
        }

        return segments.map((segment, index) => {
            const decoded = decodeTransportSegment(segment);
            const normalized = decoded?.normalizedMessage || {};
            const typeLabel = normalized.payload?.type || normalized.type || decoded?.type || 'socket_segment';
            const line = `SOCKET IN frame segment #${index} | offset=${segment.startOffset} | bytes=${segment.totalBytes} | hex=${segment.hex}`;
            return {
                ...record,
                index: record.index,
                segmentIndex: index,
                type: typeLabel,
                hex: segment.hex,
                raw: segment.hex,
                line,
                payload: normalized.payload || record.payload || {},
            };
        });
    }

    return {
        STOC_GAME_MSG,
        STOC_TIME_LIMIT,
        MSG_UPDATE_DATA,
        MSG_UPDATE_CARD,
        MSG_NEW_TURN,
        MSG_NEW_PHASE,
        MSG_MOVE,
        QUERY_FLAGS,
        normalizeHex,
        hexToBytes,
        getLocationName,
        getPositionName,
        inferCardPresence,
        getQueryFlagName,
        parseQuery,
        parseUpdateDataPayloadHex,
        parseUpdateCardPayloadHex,
        parseNewTurnPayloadHex,
        parseNewPhasePayloadHex,
        parseMovePayloadHex,
        decodeGamePayloadHex,
        decodeStocGameMsgHex,
        splitTransportSegments,
        decodeTransportSegment,
        decodeMessageRecord,
        expandMessageRecord,
        playerRoomStateName,
    };
});
