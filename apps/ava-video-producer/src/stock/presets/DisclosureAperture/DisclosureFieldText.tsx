import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";

type Props = { field: Input["fields"][number]; input: Input };
/**
 * Value visibility follows the authored toggle without changing source or
 * disclosure quantities.
 */
export function DisclosureFieldText({
  field,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const labels = [
    { text: field.label, y: 16, color: tokens.color.text },
    ...(input.showValues
      ? [{ text: field.value, y: 46, color: tokens.color.textMuted }]
      : []),
  ];
  return input.showLabels ? (
    <g>
      {labels.map((label) => {
        return (
          <FitText
            key={label.y}
            {...label}
            x={34}
            width={304}
            fontSize={12}
            maxLines={2}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </g>
  ) : (
    <SketchedShape
      shape={{ kind: "path", d: "M34 18 h284 M34 42 h236" }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
