import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./CohortRecordShared.types";
import type { ReactNode } from "react";
/** The arch of a recorded visit, sliding into place under its column. */
export function VisitArch({
  participant,
  visit,
  visitIndex,
  x,
  y,
  frame,
}: Readonly<
  Pick<Props, "participant" | "visit" | "visitIndex" | "y" | "frame"> & {
    x: number;
  }
>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const shift = mix(
    motion.ramp(
      frame,
      24 + visitIndex * motion.scaleStagger(18),
      motion.scale(24),
      motion.travel.easing,
    ),
    35,
    0,
  );
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${x - 14 + shift} ${y + 5} V${y - 18} Q${x + shift} ${y - 34} ${x + 14 + shift} ${y - 18} V${y + 5}`,
      }}
      profile={tokens.sketch.shape}
      data-visit-arch={participant.id}
      data-arch-visit={visit.id}
      stroke={tokens.color.line}
      fill="none"
    />
  );
}
