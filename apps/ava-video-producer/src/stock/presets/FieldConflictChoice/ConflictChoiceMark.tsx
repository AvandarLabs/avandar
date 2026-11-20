import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getConflictChoicePositionFromField } from "./getConflictChoicePositionFromField";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";

type Props = {
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
  accent: string;
};
/**
 * Choice rails follow the authored source. Review brackets never select one.
 */
export function ConflictChoiceMark({
  field,
  input,
  y,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const position = getConflictChoicePositionFromField({
    field,
    input,
    y,
    progress,
  });
  if (!position) {
    return <ReviewBracket fieldId={field.id} y={y} progress={progress} />;
  }
  const { x, top } = position;
  return input.decisionStyle === "sliding-rail" ? (
    <g data-choice-rail={field.id}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${top - 5}H${x + 416}` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        opacity={progress}
      />
    </g>
  ) : (
    <g data-choice-bracket={field.id}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 2} ${top - 5}h-8v76h8` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        fill="none"
        opacity={progress}
      />
    </g>
  );
}

/** A review bracket for a field whose conflict no source resolves. */
function ReviewBracket({
  fieldId,
  y,
  progress,
}: Readonly<{ fieldId: string; y: number; progress: number }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g data-review-field={fieldId}>
      <SketchedShape
        shape={{ kind: "path", d: `M468 ${y + 34}h12v58h12` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        fill="none"
        opacity={progress}
      />
    </g>
  );
}
