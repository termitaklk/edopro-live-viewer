import * as BABYLON from "@babylonjs/core";
import { LOCATION, POSITION } from "multirole-spectator-protocol";
import type {
  BoardCard,
  BoardEngineOptions,
  BoardPlayerZones,
  BoardState,
  CardLocation,
  SpectatorEventLike,
} from "./BoardTypes";
import { defaultZoneWorldPosition, getZoneName } from "./ZoneMapper";

export class BoardEngine {
  private readonly scene: BABYLON.Scene;
  private readonly cardImageBaseUrl: string;
  private readonly cardBackUrl: string;
  private readonly cardWidth: number;
  private readonly cardHeight: number;
  private readonly cardY: number;
  private readonly frontMaterials = new Map<number, BABYLON.StandardMaterial>();
  private backMaterial?: BABYLON.StandardMaterial;
  private state: BoardState = this.createInitialState();

  constructor(private readonly options: BoardEngineOptions) {
    this.scene = options.scene;
    this.cardImageBaseUrl = options.cardImageBaseUrl ?? "/cards";
    this.cardBackUrl = options.cardBackUrl ?? "/cards/back.jpg";
    this.cardWidth = options.cardWidth ?? 0.8;
    this.cardHeight = options.cardHeight ?? 1.15;
    this.cardY = options.cardY ?? 0.05;
  }

  applyEvent(event: SpectatorEventLike): void {
    this.options.onDebugEvent?.(event);

    switch (event.type) {
      case "CATCHUP":
        this.state.catchingUp = event.active;
        return;

      case "WATCH_CHANGE":
        this.state.watchCount = event.count;
        return;

      case "MSG_START":
        this.reset(event.lp);
        this.seedHiddenStack(0, LOCATION.DECK, event.deckP0);
        this.seedHiddenStack(0, LOCATION.EXTRA, event.extraP0);
        this.seedHiddenStack(1, LOCATION.DECK, event.deckP1);
        this.seedHiddenStack(1, LOCATION.EXTRA, event.extraP1);
        return;

      case "MSG_NEW_TURN":
        this.state.turnPlayer = event.player;
        return;

      case "MSG_NEW_PHASE":
        this.state.phase = event.phase;
        return;

      case "MSG_MOVE":
        this.moveCard(event);
        return;

      case "MSG_POS_CHANGE":
        this.updateCardPosition(event);
        return;

      case "MSG_UPDATE_DATA":
        this.updateZone(event);
        return;

      case "MSG_UPDATE_CARD":
        this.updateCard(event);
        return;

      case "MSG_DAMAGE":
        this.state.lp[event.player as 0 | 1] = Math.max(0, this.state.lp[event.player as 0 | 1] - event.amount);
        this.options.onLifePointsChange?.(this.state.lp);
        return;

      case "MSG_PAY_LPCOST":
        this.state.lp[event.player as 0 | 1] = Math.max(0, this.state.lp[event.player as 0 | 1] - event.cost);
        this.options.onLifePointsChange?.(this.state.lp);
        return;

      case "MSG_RECOVER":
        this.state.lp[event.player as 0 | 1] += event.amount;
        this.options.onLifePointsChange?.(this.state.lp);
        return;

      case "MSG_LPUPDATE":
        this.state.lp[event.player as 0 | 1] = event.lp;
        this.options.onLifePointsChange?.(this.state.lp);
        return;

      case "MSG_SET":
        this.playSetAnimation(event);
        return;

      case "MSG_SUMMONING":
      case "MSG_SPSUMMONING":
      case "MSG_FLIPSUMMONING":
        this.playSummonAnimation(event);
        return;
    }
  }

  moveCard(event: Extract<SpectatorEventLike, { type: "MSG_MOVE" }>): void {
    let card = this.findCard(event.from);

    if (!card) {
      card = this.createCard({
        code: event.code || null,
        controller: event.to.controller,
        location: event.to.location,
        sequence: event.to.sequence,
        position: event.to.position,
        visible: event.code !== 0,
      });
    } else {
      this.removeCard(event.from);
      card.code = event.code || null;
      card.visible = event.code !== 0;
      card.controller = event.to.controller;
      card.location = event.to.location;
      card.sequence = event.to.sequence;
      card.position = event.to.position;
    }

    this.insertCard(card, event.to);
    this.applyCardVisual(card);
    this.applyCardOrientation(card);
    this.animateMeshTo(card.mesh, this.getWorldPosition(event.to.controller, event.to.location, event.to.sequence));
  }

  updateCardPosition(event: Extract<SpectatorEventLike, { type: "MSG_POS_CHANGE" }>): void {
    const card = this.findCard({
      controller: event.controller,
      location: event.location,
      sequence: event.sequence,
      position: event.currentPosition,
    });

    if (!card) return;

    card.position = event.currentPosition;

    if (event.code !== 0) {
      card.code = event.code;
      card.visible = true;
    }

    this.applyCardVisual(card);
    this.applyCardOrientation(card);
  }

  updateZone(event: Extract<SpectatorEventLike, { type: "MSG_UPDATE_DATA" }>): void {
    this.options.onDebugEvent?.({
      type: "BOARD_UPDATE_ZONE_TODO",
      player: event.player,
      location: event.location,
      queryBufferLength: event.queryBuffer.length,
    });
  }

  updateCard(event: Extract<SpectatorEventLike, { type: "MSG_UPDATE_CARD" }>): void {
    this.options.onDebugEvent?.({
      type: "BOARD_UPDATE_CARD_TODO",
      controller: event.controller,
      location: event.location,
      sequence: event.sequence,
      queryBufferLength: event.queryBuffer.length,
    });
  }

  reloadFromSnapshot(_snapshot: unknown): void {
    this.options.onDebugEvent?.({ type: "BOARD_RELOAD_SNAPSHOT_TODO" });
  }

  playSetAnimation(event: Extract<SpectatorEventLike, { type: "MSG_SET" }>): void {
    const card = this.findCard(event.card);
    if (card) this.pulse(card.mesh, 1.08);
  }

  playSummonAnimation(
    event: Extract<SpectatorEventLike, { type: "MSG_SUMMONING" | "MSG_SPSUMMONING" | "MSG_FLIPSUMMONING" }>,
  ): void {
    const card = this.findCard(event.card);
    if (card) this.pulse(card.mesh, 1.15);
  }

  render(): void {
    for (const card of this.allCards()) {
      card.mesh.position.copyFrom(this.getWorldPosition(card.controller, card.location, card.sequence));
      this.applyCardOrientation(card);
      this.applyCardVisual(card);
    }
  }

  snapshot(): BoardState {
    return {
      ...this.state,
      players: [
        cloneZonesShallow(this.state.players[0]),
        cloneZonesShallow(this.state.players[1]),
      ],
      lp: [...this.state.lp] as [number, number],
    };
  }

  reset(lp = 8000): void {
    for (const card of this.allCards()) {
      card.mesh.dispose(false, true);
    }
    this.state = this.createInitialState(lp);
  }

  private createInitialState(lp = 8000): BoardState {
    return {
      players: [createZones(), createZones()],
      lp: [lp, lp],
      turnPlayer: null,
      phase: null,
      watchCount: 0,
      catchingUp: false,
    };
  }

  private seedHiddenStack(controller: number, location: number, count: number): void {
    for (let sequence = 0; sequence < count; sequence++) {
      const card = this.createCard({
        code: null,
        controller,
        location,
        sequence,
        position: null,
        visible: false,
      });
      this.insertCard(card, { controller, location, sequence, position: 0 });
      card.mesh.position.copyFrom(this.getWorldPosition(controller, location, sequence));
    }
  }

  private createCard(input: {
    code: number | null;
    controller: number;
    location: number;
    sequence: number;
    position: number | null;
    visible: boolean;
  }): BoardCard {
    const mesh = BABYLON.MeshBuilder.CreatePlane(
      `card-${safeId()}`,
      { width: this.cardWidth, height: this.cardHeight },
      this.scene,
    );

    mesh.position.copyFrom(this.getWorldPosition(input.controller, input.location, input.sequence));

    const card: BoardCard = {
      id: mesh.name,
      code: input.code,
      controller: input.controller,
      location: input.location,
      sequence: input.sequence,
      position: input.position,
      visible: input.visible && input.code !== null,
      mesh,
    };

    this.applyCardVisual(card);
    this.applyCardOrientation(card);
    return card;
  }

  private findCard(loc: Pick<CardLocation, "controller" | "location" | "sequence">): BoardCard | null {
    const zone = this.getZone(loc.controller, loc.location);
    if (!zone) return null;

    if (loc.location === LOCATION.MZONE || loc.location === LOCATION.SZONE) {
      return (zone[loc.sequence] as BoardCard | null) ?? null;
    }

    return (zone as BoardCard[]).find((card) => card.sequence === loc.sequence) ?? null;
  }

  private removeCard(loc: Pick<CardLocation, "controller" | "location" | "sequence">): BoardCard | null {
    const zone = this.getZone(loc.controller, loc.location);
    if (!zone) return null;

    if (loc.location === LOCATION.MZONE || loc.location === LOCATION.SZONE) {
      const card = zone[loc.sequence] as BoardCard | null;
      zone[loc.sequence] = null;
      return card;
    }

    const list = zone as BoardCard[];
    const index = list.findIndex((card) => card.sequence === loc.sequence);
    if (index < 0) return null;

    const [card] = list.splice(index, 1);
    this.resequence(list);
    return card ?? null;
  }

  private insertCard(card: BoardCard, loc: CardLocation): void {
    const zone = this.getZone(loc.controller, loc.location);
    if (!zone) return;

    card.controller = loc.controller;
    card.location = loc.location;
    card.sequence = loc.sequence;
    card.position = loc.position;

    if (loc.location === LOCATION.MZONE || loc.location === LOCATION.SZONE) {
      zone[loc.sequence] = card;
      return;
    }

    const list = zone as BoardCard[];
    const existingIndex = list.findIndex((item) => item.id === card.id);
    if (existingIndex >= 0) list.splice(existingIndex, 1);

    if (loc.sequence >= 0 && loc.sequence <= list.length) {
      list.splice(loc.sequence, 0, card);
    } else {
      list.push(card);
    }

    this.resequence(list);
  }

  private getZone(controller: number, location: number): Array<BoardCard | null> | BoardCard[] | null {
    const player = this.state.players[controller as 0 | 1];
    if (!player) return null;
    const name = getZoneName(location);
    if (name === "unknown") return null;
    return player[name as keyof BoardPlayerZones];
  }

  private resequence(list: BoardCard[]): void {
    list.forEach((card, index) => {
      card.sequence = index;
    });
  }

  private allCards(): BoardCard[] {
    return this.state.players.flatMap((player) => [
      ...player.deck,
      ...player.hand,
      ...(player.mzone.filter(Boolean) as BoardCard[]),
      ...(player.szone.filter(Boolean) as BoardCard[]),
      ...player.grave,
      ...player.removed,
      ...player.extra,
      ...player.overlay,
    ]);
  }

  private getWorldPosition(controller: number, location: number, sequence: number): BABYLON.Vector3 {
    return this.options.getZoneWorldPosition
      ? this.options.getZoneWorldPosition(controller, location, sequence)
      : defaultZoneWorldPosition(controller, location, sequence, this.cardY);
  }

  private animateMeshTo(mesh: BABYLON.Mesh, target: BABYLON.Vector3): void {
    BABYLON.Animation.CreateAndStartAnimation(
      "move-card",
      mesh,
      "position",
      60,
      20,
      mesh.position.clone(),
      target,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
  }

  private pulse(mesh: BABYLON.Mesh, scale = 1.1): void {
    const from = mesh.scaling.clone();
    const to = from.scale(scale);

    BABYLON.Animation.CreateAndStartAnimation(
      "pulse-card-up",
      mesh,
      "scaling",
      60,
      8,
      from,
      to,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => {
        BABYLON.Animation.CreateAndStartAnimation(
          "pulse-card-down",
          mesh,
          "scaling",
          60,
          8,
          to,
          from,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
      },
    );
  }

  private applyCardOrientation(card: BoardCard): void {
    const mesh = card.mesh;
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.y = card.controller === 1 ? Math.PI : 0;

    switch (card.position) {
      case POSITION.FACEUP_ATTACK:
      case POSITION.FACEDOWN_ATTACK:
        mesh.rotation.z = 0;
        break;
      case POSITION.FACEUP_DEFENSE:
      case POSITION.FACEDOWN_DEFENSE:
        mesh.rotation.z = Math.PI / 2;
        break;
      default:
        mesh.rotation.z = 0;
        break;
    }
  }

  private applyCardVisual(card: BoardCard): void {
    if (!card.visible || !card.code) {
      card.mesh.material = this.getBackMaterial();
      return;
    }
    card.mesh.material = this.getFrontMaterial(card.code);
  }

  private getBackMaterial(): BABYLON.StandardMaterial {
    if (this.backMaterial) return this.backMaterial;
    const mat = new BABYLON.StandardMaterial("card-back-material", this.scene);
    mat.diffuseTexture = new BABYLON.Texture(this.cardBackUrl, this.scene);
    mat.specularColor = BABYLON.Color3.Black();
    this.backMaterial = mat;
    return mat;
  }

  private getFrontMaterial(code: number): BABYLON.StandardMaterial {
    const existing = this.frontMaterials.get(code);
    if (existing) return existing;

    const mat = new BABYLON.StandardMaterial(`card-front-${code}`, this.scene);
    mat.diffuseTexture = new BABYLON.Texture(`${this.cardImageBaseUrl}/${code}.jpg`, this.scene);
    mat.specularColor = BABYLON.Color3.Black();
    this.frontMaterials.set(code, mat);
    return mat;
  }
}

function createZones(): BoardPlayerZones {
  return {
    deck: [],
    hand: [],
    mzone: Array.from({ length: 7 }, () => null),
    szone: Array.from({ length: 8 }, () => null),
    grave: [],
    removed: [],
    extra: [],
    overlay: [],
  };
}

function cloneZonesShallow(zones: BoardPlayerZones): BoardPlayerZones {
  return {
    deck: [...zones.deck],
    hand: [...zones.hand],
    mzone: [...zones.mzone],
    szone: [...zones.szone],
    grave: [...zones.grave],
    removed: [...zones.removed],
    extra: [...zones.extra],
    overlay: [...zones.overlay],
  };
}

function safeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
