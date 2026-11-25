import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  selectedRow: number;
};
/** The active selected source row stays keyed to its traveling frozen copy. */
export function SnapshotRowGuide({
  input,
  frame,
  accent,
  selectedRow,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const duration = 36 / input.selection.rowIds.length,
    departure =
      56 + (input.selection.rowIds.length - 1 - selectedRow) * duration;
  const sourceRow = input.table.rows.findIndex(
    propEq("id", input.selection.rowIds[selectedRow]),
  );
  const sourceY = 276 + sourceRow * 72,
    copyY = Motion.mix({
      t: motion.ramp(frame, departure, duration - 1, motion.travel.easing),
      from: 240,
      to: 276 + selectedRow * 72,
    });
  const opacity =
    motion.ramp(frame, departure, motion.scale(1)) *
    (1 - motion.ramp(frame, departure + duration - 1, motion.scale(1)));
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M452 ${sourceY} H480 V${copyY} H508` }}
      profile={tokens.sketch.shape}
      data-copy-source-row={input.selection.rowIds[selectedRow]}
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
      opacity={opacity}
    />
  );
}
