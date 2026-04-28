export declare class PacketDecoder {
    private pending;
    push(chunk: Buffer): Buffer[];
    reset(): void;
}
