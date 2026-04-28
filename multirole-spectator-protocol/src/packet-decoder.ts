export class PacketDecoder {
  private pending = Buffer.alloc(0);

  push(chunk: Buffer): Buffer[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const packets: Buffer[] = [];

    while (this.pending.length >= 3) {
      const length = this.pending.readUInt16LE(0);
      const total = 2 + length;

      if (length < 1) throw new Error(`Invalid packet length: ${length}`);
      if (this.pending.length < total) break;

      packets.push(this.pending.subarray(0, total));
      this.pending = this.pending.subarray(total);
    }

    return packets;
  }

  reset(): void {
    this.pending = Buffer.alloc(0);
  }
}
