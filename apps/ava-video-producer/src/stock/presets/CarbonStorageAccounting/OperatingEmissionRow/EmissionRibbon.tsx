import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OperatingEmissionRowShared } from "./OperatingEmissionRowShared/OperatingEmissionRowShared";
import { type Props as OperatingEmissionRowSharedProps } from "./OperatingEmissionRowShared/OperatingEmissionRowShared.types";
import type { ReactNode } from "react";

type Props = Omit<OperatingEmissionRowSharedProps, "unit">;
/** The source's ribbon, as wide as its emissions, drawing across the ledger. */
export function EmissionRibbon({
  row,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M540 ${264 + index * 80} H${Motion.mix({
          t: motion.ramp(frame, 60, motion.scale(48), motion.travel.easing),
          from: 540,
          to: 918,
        })}`,
      }}
      profile={tokens.sketch.shape}
      data-operation-ribbon={row.id}
      data-tonnes={row.tonnesCO2e}
      stroke={tokens.color.highlight}
      strokeWidth={scales.stroke(
        OperatingEmissionRowShared.RIBBON_WIDTH_PER_KILOTONNE *
          (row.tonnesCO2e / 1000),
      )}
      fill="none"
    />
  );
}
