import { SpectatorEvent } from "../types";

export type SpectatorSnapshot = {
  lp: [number, number];
  turnPlayer: number | null;
  phase: number | null;
  catchingUp: boolean;
  watchCount: number;
  lastEvent: SpectatorEvent | null;
};

export class SpectatorState {
  private state: SpectatorSnapshot = {
    lp: [8000, 8000],
    turnPlayer: null,
    phase: null,
    catchingUp: false,
    watchCount: 0,
    lastEvent: null,
  };

  apply(event: SpectatorEvent): SpectatorSnapshot {
    this.state.lastEvent = event;

    switch (event.type) {
      case "MSG_START":
        this.state.lp = [event.lp, event.lp];
        break;
      case "CATCHUP":
        this.state.catchingUp = event.active;
        break;
      case "WATCH_CHANGE":
        this.state.watchCount = event.count;
        break;
      case "MSG_NEW_TURN":
        this.state.turnPlayer = event.player;
        break;
      case "MSG_NEW_PHASE":
        this.state.phase = event.phase;
        break;
      case "MSG_DAMAGE":
        this.state.lp[event.player as 0 | 1] = Math.max(
          0,
          this.state.lp[event.player as 0 | 1] - event.amount,
        );
        break;

      case "MSG_PAY_LPCOST":
        this.state.lp[event.player as 0 | 1] = Math.max(
          0,
          this.state.lp[event.player as 0 | 1] - event.cost,
        );
        break;
      case "MSG_RECOVER":
        this.state.lp[event.player as 0 | 1] += event.amount;
        break;
      case "MSG_LPUPDATE":
        this.state.lp[event.player as 0 | 1] = event.lp;
        break;
    }

    return this.snapshot();
  }

  snapshot(): SpectatorSnapshot {
    return JSON.parse(JSON.stringify(this.state));
  }
}
