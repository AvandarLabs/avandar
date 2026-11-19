import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getSpineContributionFromFrame } from "./getSpineContributionFromFrame";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
  accent: string;
};

/** A contribution chip's corner before the corner style scales it. */
const CHIP_CORNER = 3;
/** A complete numeric value travels from its source into its entity stack. */
export function SpineContribution({
  input,
  observation,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const { x, y, opacity } = getSpineContributionFromFrame({
    input,
    observation,
    index,
    frame,
    motion,
  });
  return (
    <g data-spine-contribution={observation.id} opacity={opacity}>
      <StockRect
        data-contribution-body={observation.id}
        x={x - 3}
        y={y - 14}
        width={222}
        height={18}
        rx={scales.corner(CHIP_CORNER)}
        fill={tokens.color.elevated}
        stroke={accent}
      />
      <LabelSlots labels={[[String(observation.value), x, y, 216, 12, 1]]} />
    </g>
  );
}
