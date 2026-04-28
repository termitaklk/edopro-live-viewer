import { SpectatorEvent } from "./types";
export declare class MultiroleSpectatorDecoder {
    private readonly packetDecoder;
    push(chunk: Buffer): SpectatorEvent[];
    reset(): void;
}
