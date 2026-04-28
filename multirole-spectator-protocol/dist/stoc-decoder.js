"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeSTOC = decodeSTOC;
const constants_1 = require("./constants");
const game_msg_decoder_1 = require("./game-msg-decoder");
const reader_1 = require("./reader");
function decodeSTOC(packet) {
    const type = packet.readUInt8(2);
    const payload = packet.subarray(3);
    try {
        switch (type) {
            case constants_1.STOC.GAME_MSG:
                return (0, game_msg_decoder_1.decodeGameMsg)(payload);
            case constants_1.STOC.ERROR_MSG:
                return { type: "STOC_ERROR_MSG", raw: payload };
            case constants_1.STOC.DUEL_START:
                return { type: "DUEL_START" };
            case constants_1.STOC.DUEL_END:
                return { type: "DUEL_END" };
            case constants_1.STOC.CATCHUP:
                return { type: "CATCHUP", active: payload.readUInt8(0) === 1 };
            case constants_1.STOC.WATCH_CHANGE:
                return { type: "WATCH_CHANGE", count: payload.readUInt16LE(0) };
            case constants_1.STOC.TYPE_CHANGE: {
                const raw = payload.readUInt8(0);
                return { type: "TYPE_CHANGE", raw, isHost: ((raw >> 4) & 1) === 1, position: raw & 0x0f };
            }
            case constants_1.STOC.CHAT_2: {
                const r = new reader_1.Reader(payload);
                return { type: "CHAT_2", chatType: r.u8(), isTeam: r.u8() === 1, clientName: r.utf16Fixed(20), message: r.utf16Fixed(256) };
            }
            default:
                return { type: "UNKNOWN_STOC", id: type, raw: payload };
        }
    }
    catch {
        return { type: "UNKNOWN_STOC", id: type, raw: payload };
    }
}
