import type * as BABYLON from "@babylonjs/core";

export type CardLocation = {
  controller: number;
  location: number;
  sequence: number;
  position: number;
};

export type BoardCard = {
  id: string;
  code: number | null;
  controller: number;
  location: number;
  sequence: number;
  position: number | null;
  mesh: BABYLON.Mesh;
  visible: boolean;
};

export type BoardPlayerZones = {
  deck: BoardCard[];
  hand: BoardCard[];
  mzone: Array<BoardCard | null>;
  szone: Array<BoardCard | null>;
  grave: BoardCard[];
  removed: BoardCard[];
  extra: BoardCard[];
  overlay: BoardCard[];
};

export type BoardState = {
  players: [BoardPlayerZones, BoardPlayerZones];
  lp: [number, number];
  turnPlayer: number | null;
  phase: number | null;
  watchCount: number;
  catchingUp: boolean;
};

export type BoardEngineOptions = {
  scene: BABYLON.Scene;
  cardImageBaseUrl?: string;
  cardBackUrl?: string;
  cardWidth?: number;
  cardHeight?: number;
  cardY?: number;
  getZoneWorldPosition?: (
    controller: number,
    location: number,
    sequence: number,
  ) => BABYLON.Vector3;
  onLifePointsChange?: (lp: [number, number]) => void;
  onDebugEvent?: (event: unknown) => void;
};

export type SpectatorEventLike =
  | { type: "DUEL_START" }
  | { type: "DUEL_END" }
  | { type: "CATCHUP"; active: boolean }
  | { type: "WATCH_CHANGE"; count: number }
  | { type: "MSG_START"; startPlayer: number; lp: number; deckP0: number; extraP0: number; deckP1: number; extraP1: number }
  | { type: "MSG_UPDATE_DATA"; player: number; location: number; queryBuffer: Buffer }
  | { type: "MSG_UPDATE_CARD"; controller: number; location: number; sequence: number; queryBuffer: Buffer }
  | { type: "MSG_NEW_TURN"; player: number }
  | { type: "MSG_NEW_PHASE"; phase: number }
  | { type: "MSG_MOVE"; code: number; from: CardLocation; to: CardLocation; reason: number }
  | { type: "MSG_POS_CHANGE"; code: number; controller: number; location: number; sequence: number; previousPosition: number; currentPosition: number }
  | { type: "MSG_SET"; code: number; card: CardLocation }
  | { type: "MSG_SUMMONING"; code: number; card: CardLocation }
  | { type: "MSG_SUMMONED" }
  | { type: "MSG_SPSUMMONING"; code: number; card: CardLocation }
  | { type: "MSG_SPSUMMONED" }
  | { type: "MSG_FLIPSUMMONING"; code: number; card: CardLocation }
  | { type: "MSG_FLIPSUMMONED" }
  | { type: "MSG_DAMAGE"; player: number; amount: number }
  | { type: "MSG_RECOVER"; player: number; amount: number }
  | { type: "MSG_LPUPDATE"; player: number; lp: number }
  | { type: "MSG_PAY_LPCOST"; player: number; cost: number }
  | { type: "MSG_ATTACK"; attacker: CardLocation; target: CardLocation }
  | { type: "MSG_WIN"; winner: number; reason: number }
  | { type: string; [key: string]: unknown };
