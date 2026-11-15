import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { getCultivatorHandFromFrame } from "./getCultivatorHandFromFrame";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { Input } from "./SavedSeedSeasonReturn.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * Cultivator contact follows the retained lot and the tip of the drawn furrow.
 */
export function SeedCultivator({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const hand = getCultivatorHandFromFrame({ scene, frame });
  return (
    <g data-cultivator={input.cultivator.mode}>
      <PersonGlyph x={hand.x - 28} y={hand.y - 40} color={accent} />
      {input.cultivator.mode === "cooperative" ? (
        <PersonGlyph x={65} y={295} color={STOCK.cyan} />
      ) : undefined}
      {hand.action ? (
        <line
          data-seed-hand={hand.action}
          x1={hand.x - 28}
          y1={hand.y - 40}
          x2={hand.x}
          y2={hand.y}
          stroke={accent}
          strokeWidth={3}
        />
      ) : undefined}
    </g>
  );
}
