export type CardLocation = {
    controller: number;
    location: number;
    sequence: number;
    position: number;
};
export type VisibleCard = CardLocation & {
    code: number;
    visible: boolean;
};
export type SpectatorEvent = {
    type: "DUEL_START";
} | {
    type: "DUEL_END";
} | {
    type: "CATCHUP";
    active: boolean;
} | {
    type: "WATCH_CHANGE";
    count: number;
} | {
    type: "TYPE_CHANGE";
    raw: number;
    isHost: boolean;
    position: number;
} | {
    type: "CHAT_2";
    chatType: number;
    isTeam: boolean;
    clientName: string;
    message: string;
} | {
    type: "STOC_ERROR_MSG";
    raw: Buffer;
} | {
    type: "MSG_START";
    startPlayer: number;
    lp: number;
    deckP0: number;
    extraP0: number;
    deckP1: number;
    extraP1: number;
} | {
    type: "MSG_WIN";
    winner: number;
    reason: number;
} | {
    type: "MSG_UPDATE_DATA";
    player: number;
    location: number;
    queryBuffer: Buffer;
} | {
    type: "MSG_UPDATE_CARD";
    controller: number;
    location: number;
    sequence: number;
    queryBuffer: Buffer;
} | {
    type: "MSG_NEW_TURN";
    player: number;
} | {
    type: "MSG_NEW_PHASE";
    phase: number;
} | {
    type: "MSG_MOVE";
    code: number;
    from: CardLocation;
    to: CardLocation;
    reason: number;
} | {
    type: "MSG_POS_CHANGE";
    code: number;
    controller: number;
    location: number;
    sequence: number;
    previousPosition: number;
    currentPosition: number;
} | {
    type: "MSG_SET";
    code: number;
    card: CardLocation;
} | {
    type: "MSG_SUMMONING";
    code: number;
    card: CardLocation;
} | {
    type: "MSG_SUMMONED";
} | {
    type: "MSG_SPSUMMONING";
    code: number;
    card: CardLocation;
} | {
    type: "MSG_SPSUMMONED";
} | {
    type: "MSG_FLIPSUMMONING";
    code: number;
    card: CardLocation;
} | {
    type: "MSG_FLIPSUMMONED";
} | {
    type: "MSG_CHAINING";
    code: number;
    card: CardLocation;
    trigger: CardLocation;
    descriptionController: number;
    description: number;
    chainSize: number;
} | {
    type: "MSG_CHAINED";
    chainSize: number;
} | {
    type: "MSG_CHAIN_SOLVING";
    chainSize: number;
} | {
    type: "MSG_CHAIN_SOLVED";
    chainSize: number;
} | {
    type: "MSG_CHAIN_END";
} | {
    type: "MSG_DRAW";
    player: number;
    count: number;
    codes: number[];
} | {
    type: "MSG_DAMAGE";
    player: number;
    amount: number;
} | {
    type: "MSG_RECOVER";
    player: number;
    amount: number;
} | {
    type: "MSG_LPUPDATE";
    player: number;
    lp: number;
} | {
    type: "MSG_PAY_LPCOST";
    player: number;
    cost: number;
} | {
    type: "MSG_ATTACK";
    attacker: CardLocation;
    target: CardLocation;
} | {
    type: "UNKNOWN_STOC";
    id: number;
    raw: Buffer;
} | {
    type: "UNKNOWN_MSG";
    id: number;
    raw: Buffer;
};
