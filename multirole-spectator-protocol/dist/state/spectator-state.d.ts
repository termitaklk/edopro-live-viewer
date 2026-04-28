import { SpectatorEvent } from "../types";
export type SpectatorSnapshot = {
    lp: [number, number];
    turnPlayer: number | null;
    phase: number | null;
    catchingUp: boolean;
    watchCount: number;
    lastEvent: SpectatorEvent | null;
};
export declare class SpectatorState {
    private state;
    apply(event: SpectatorEvent): SpectatorSnapshot;
    snapshot(): SpectatorSnapshot;
}
