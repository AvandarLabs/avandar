import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SeedPortion } from "./SeedPortion";
import type { ResolvedVideoSemantic } from "../../../videoTheme/videoTheme.types";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  accent: string;
};
type Destination = "current" | "remaining" | "sown" | "loss";
type Portion = [Destination, { x: number; y: number }, number, string];
function _getPortions({
  scene,
  frame,
  accent,
  tokens,
}: Readonly<Props & { tokens: ResolvedVideoSemantic }>): Portion[] {
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
        [
          "remaining",
          reservePosition,
          remaining * scale,
          tokens.color.positive,
        ],
        ["sown", sownPoint, sown * scale, tokens.color.accentAlt],
        ["loss", lossPoint, loss * scale, tokens.color.highlight],
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
  const tokens = useGraphicTokens();
  return (
    <g>
      {_getPortions({ scene, frame, accent, tokens }).map(
        ([destination, position, width, color]) => {
          return (
            <SeedPortion
              key={destination}
              destination={destination}
              position={position}
              width={width}
              color={color}
            />
          );
        },
      )}
    </g>
  );
}
