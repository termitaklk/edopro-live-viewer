"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectatorState = void 0;
class SpectatorState {
    constructor() {
        this.state = {
            lp: [8000, 8000],
            turnPlayer: null,
            phase: null,
            catchingUp: false,
            watchCount: 0,
            lastEvent: null,
        };
    }
    apply(event) {
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
                this.state.lp[event.player] = Math.max(0, this.state.lp[event.player] - event.amount);
                break;
            case "MSG_PAY_LPCOST":
                this.state.lp[event.player] = Math.max(0, this.state.lp[event.player] - event.cost);
                break;
            case "MSG_RECOVER":
                this.state.lp[event.player] += event.amount;
                break;
            case "MSG_LPUPDATE":
                this.state.lp[event.player] = event.lp;
                break;
        }
        return this.snapshot();
    }
    snapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }
}
exports.SpectatorState = SpectatorState;
