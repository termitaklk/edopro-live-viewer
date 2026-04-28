import { STOC } from "./constants";
import { decodeGameMsg } from "./game-msg-decoder";
import { Reader } from "./reader";
import { SpectatorEvent } from "./types";

export function decodeSTOC(packet: Buffer): SpectatorEvent {
  const type = packet.readUInt8(2);
  const payload = packet.subarray(3);

  try {
    switch (type) {
      case STOC.GAME_MSG:
        return decodeGameMsg(payload);
      case STOC.ERROR_MSG:
        return { type: "STOC_ERROR_MSG", raw: payload };
      case STOC.DUEL_START:
        return { type: "DUEL_START" };
      case STOC.DUEL_END:
        return { type: "DUEL_END" };
      case STOC.CATCHUP:
        return { type: "CATCHUP", active: payload.readUInt8(0) === 1 };
      case STOC.WATCH_CHANGE:
        return { type: "WATCH_CHANGE", count: payload.readUInt16LE(0) };
      case STOC.TYPE_CHANGE: {
        const raw = payload.readUInt8(0);
        return { type: "TYPE_CHANGE", raw, isHost: ((raw >> 4) & 1) === 1, position: raw & 0x0f };
      }
      case STOC.CHAT_2: {
        const r = new Reader(payload);
        return { type: "CHAT_2", chatType: r.u8(), isTeam: r.u8() === 1, clientName: r.utf16Fixed(20), message: r.utf16Fixed(256) };
      }
      default:
        return { type: "UNKNOWN_STOC", id: type, raw: payload };
    }
  } catch {
    return { type: "UNKNOWN_STOC", id: type, raw: payload };
  }
}
