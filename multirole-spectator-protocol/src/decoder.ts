import { PacketDecoder } from "./packet-decoder";
import { decodeSTOC } from "./stoc-decoder";
import { SpectatorEvent } from "./types";

export class MultiroleSpectatorDecoder {
  private readonly packetDecoder = new PacketDecoder();

  push(chunk: Buffer): SpectatorEvent[] {
    return this.packetDecoder.push(chunk).map(decodeSTOC);
  }

  reset(): void {
    this.packetDecoder.reset();
  }
}
