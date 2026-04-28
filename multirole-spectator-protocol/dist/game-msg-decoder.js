"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeGameMsg = decodeGameMsg;
const constants_1 = require("./constants");
const reader_1 = require("./reader");
function decodeGameMsg(payload) {
    const r = new reader_1.Reader(payload);
    const id = r.u8();
    try {
        switch (id) {
            case constants_1.MSG.START:
                return { type: "MSG_START", startPlayer: r.u8(), lp: r.u32(), deckP0: r.u16(), extraP0: r.u16(), deckP1: r.u16(), extraP1: r.u16() };
            case constants_1.MSG.WIN:
                return { type: "MSG_WIN", winner: r.u8(), reason: r.u8() };
            case constants_1.MSG.UPDATE_DATA:
                return { type: "MSG_UPDATE_DATA", player: r.u8(), location: r.u8(), queryBuffer: r.rest() };
            case constants_1.MSG.UPDATE_CARD:
                return { type: "MSG_UPDATE_CARD", controller: r.u8(), location: r.u8(), sequence: r.u8(), queryBuffer: r.rest() };
            case constants_1.MSG.NEW_TURN:
                return { type: "MSG_NEW_TURN", player: r.u8() };
            case constants_1.MSG.NEW_PHASE:
                return { type: "MSG_NEW_PHASE", phase: r.u16() };
            case constants_1.MSG.MOVE:
                return { type: "MSG_MOVE", code: r.u32(), from: r.location(), to: r.location(), reason: r.u32() };
            case constants_1.MSG.POS_CHANGE:
                return { type: "MSG_POS_CHANGE", code: r.u32(), controller: r.u8(), location: r.u8(), sequence: r.u8(), previousPosition: r.u8(), currentPosition: r.u8() };
            case constants_1.MSG.SET:
                return { type: "MSG_SET", code: r.u32(), card: r.location() };
            case constants_1.MSG.SUMMONING:
                return { type: "MSG_SUMMONING", code: r.u32(), card: r.location() };
            case constants_1.MSG.SUMMONED:
                return { type: "MSG_SUMMONED" };
            case constants_1.MSG.SPSUMMONING:
                return { type: "MSG_SPSUMMONING", code: r.u32(), card: r.location() };
            case constants_1.MSG.SPSUMMONED:
                return { type: "MSG_SPSUMMONED" };
            case constants_1.MSG.FLIPSUMMONING:
                return { type: "MSG_FLIPSUMMONING", code: r.u32(), card: r.location() };
            case constants_1.MSG.FLIPSUMMONED:
                return { type: "MSG_FLIPSUMMONED" };
            case constants_1.MSG.CHAINING:
                return { type: "MSG_CHAINING", code: r.u32(), card: r.location(), trigger: r.location(), descriptionController: r.u8(), description: r.u32(), chainSize: r.u8() };
            case constants_1.MSG.CHAINED:
                return { type: "MSG_CHAINED", chainSize: r.u8() };
            case constants_1.MSG.CHAIN_SOLVING:
                return { type: "MSG_CHAIN_SOLVING", chainSize: r.u8() };
            case constants_1.MSG.CHAIN_SOLVED:
                return { type: "MSG_CHAIN_SOLVED", chainSize: r.u8() };
            case constants_1.MSG.CHAIN_END:
                return { type: "MSG_CHAIN_END" };
            case constants_1.MSG.DRAW: {
                const player = r.u8();
                const count = r.u8();
                const codes = [];
                for (let i = 0; i < count && r.remaining() >= 4; i++)
                    codes.push(r.u32());
                return { type: "MSG_DRAW", player, count, codes };
            }
            case constants_1.MSG.DAMAGE:
                return { type: "MSG_DAMAGE", player: r.u8(), amount: r.u32() };
            case constants_1.MSG.RECOVER:
                return { type: "MSG_RECOVER", player: r.u8(), amount: r.u32() };
            case constants_1.MSG.LPUPDATE:
                return { type: "MSG_LPUPDATE", player: r.u8(), lp: r.u32() };
            case constants_1.MSG.PAY_LPCOST:
                return { type: "MSG_PAY_LPCOST", player: r.u8(), cost: r.u32() };
            case constants_1.MSG.ATTACK:
                return { type: "MSG_ATTACK", attacker: r.location(), target: r.location() };
            default:
                return { type: "UNKNOWN_MSG", id, raw: payload };
        }
    }
    catch {
        return { type: "UNKNOWN_MSG", id, raw: payload };
    }
}
