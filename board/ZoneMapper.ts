import * as BABYLON from "@babylonjs/core";
import { LOCATION } from "multirole-spectator-protocol";

export function getZoneName(location: number) {
  switch (location) {
    case LOCATION.DECK: return "deck";
    case LOCATION.HAND: return "hand";
    case LOCATION.MZONE: return "mzone";
    case LOCATION.SZONE: return "szone";
    case LOCATION.GRAVE: return "grave";
    case LOCATION.REMOVED: return "removed";
    case LOCATION.EXTRA: return "extra";
    case LOCATION.OVERLAY: return "overlay";
    default: return "unknown";
  }
}

export function defaultZoneWorldPosition(
  controller: number,
  location: number,
  sequence: number,
  cardY = 0.05,
): BABYLON.Vector3 {
  const side = controller === 0 ? 1 : -1;

  switch (location) {
    case LOCATION.MZONE:
      return new BABYLON.Vector3((sequence - 2) * 1.4, cardY, side * 2);
    case LOCATION.SZONE:
      return new BABYLON.Vector3((sequence - 2) * 1.4, cardY, side * 3.4);
    case LOCATION.GRAVE:
      return new BABYLON.Vector3(4.5, cardY, side * 3.4);
    case LOCATION.DECK:
      return new BABYLON.Vector3(-4.5, cardY, side * 3.4);
    case LOCATION.EXTRA:
      return new BABYLON.Vector3(-5.8, cardY, side * 2);
    case LOCATION.REMOVED:
      return new BABYLON.Vector3(5.8, cardY, side * 2);
    case LOCATION.HAND:
      return new BABYLON.Vector3((sequence - 3) * 0.8, cardY, side * 5);
    case LOCATION.OVERLAY:
      return new BABYLON.Vector3((sequence - 2) * 1.4, cardY + 0.03, side * 2);
    default:
      return new BABYLON.Vector3(0, cardY, 0);
  }
}
