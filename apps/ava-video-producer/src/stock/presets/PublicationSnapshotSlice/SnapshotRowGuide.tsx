import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const duration = 36 / input.selection.rowIds.length,
    departure =
      56 + (input.selection.rowIds.length - 1 - selectedRow) * duration;
  const sourceRow = input.table.rows.findIndex(({ id }) => {
    return id === input.selection.rowIds[selectedRow];
  });
  const sourceY = 276 + sourceRow * 72,
    copyY = mix(
      motion.ramp(frame, departure, duration - 1, motion.travel.easing),
      240,
      276 + selectedRow * 72,
    );
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
