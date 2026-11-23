import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CellLiteralValue } from "./CellLiteralValue";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import { RAIL_CUE, RAIL_FRAMES } from "./cleanupTiming";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["rows"][number];
  input: Input;
  frame: number;
};
/** Retained originals use the rail heading or their own inline sublabel. */
export function CleanupRetainedValue({
  row,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const inline = input.comparison === "inline-ghost";
  return (
    <g
      data-original-value={row.before}
      opacity={Motion.ramp({
        frame,
        at: RAIL_CUE,
        dur: motion.scale(RAIL_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      {inline ? (
        <CleanupLaneHeading
          text={input.columnLabels.original}
          labelRole="original"
          placement="retained"
          x={88}
          y={42}
          isSublabel
        />
      ) : undefined}
      <g data-retained-literal={row.id}>
        <CellLiteralValue
          value={row.before}
          x={inline ? 88 : 514}
          y={inline ? 62 : 22}
          showWhitespace={input.showWhitespace}
          color={tokens.color.textMuted}
        />
      </g>
    </g>
  );
}
