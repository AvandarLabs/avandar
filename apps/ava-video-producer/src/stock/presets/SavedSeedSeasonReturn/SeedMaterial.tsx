import { STOCK } from "../../stockPalette";
import { SeedPortion } from "./SeedPortion";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  accent: string;
};
type Destination = "current" | "remaining" | "sown" | "loss";
type Portion = [Destination, { x: number; y: number }, number, string];
function _getPortions({ scene, frame, accent }: Readonly<Props>): Portion[] {
  const {
    scale,
    current,
    remaining,
    sown,
    loss,
    reservePosition,
    lossPosition,
    sownPosition,
  } = scene;
  const lossPoint =
    frame < 74
      ? {
          x: reservePosition.x + (remaining + sown) * scale,
          y: reservePosition.y,
        }
      : lossPosition;
  const sownPoint =
    frame < 124
      ? { x: reservePosition.x + remaining * scale, y: reservePosition.y }
      : sownPosition;
  return frame < 12
    ? [["current", { x: 58, y: 385 }, 180, accent]]
    : [
        ["current", { x: 58, y: 385 }, current * scale, accent],
        ["remaining", reservePosition, remaining * scale, STOCK.mint],
        ["sown", sownPoint, sown * scale, STOCK.cyan],
        ["loss", lossPoint, loss * scale, STOCK.orange],
      ];
}
/**
 * Four disjoint portions preserve visible material area through every transfer.
 */
export function SeedMaterial({
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {_getPortions({ scene, frame, accent }).map(
        ([destination, position, width, color]) => (
          <SeedPortion
            key={destination}
            destination={destination}
            position={position}
            width={width}
            color={color}
          />
        ),
      )}
    </g>
  );
}
