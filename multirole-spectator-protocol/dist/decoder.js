"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiroleSpectatorDecoder = void 0;
const packet_decoder_1 = require("./packet-decoder");
const stoc_decoder_1 = require("./stoc-decoder");
class MultiroleSpectatorDecoder {
    constructor() {
        this.packetDecoder = new packet_decoder_1.PacketDecoder();
    }
    push(chunk) {
        return this.packetDecoder.push(chunk).map(stoc_decoder_1.decodeSTOC);
    }
    reset() {
        this.packetDecoder.reset();
    }
}
exports.MultiroleSpectatorDecoder = MultiroleSpectatorDecoder;
