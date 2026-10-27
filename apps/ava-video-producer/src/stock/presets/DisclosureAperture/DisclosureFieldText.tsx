import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
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
  const labels = [
    { text: field.label, y: 16, color: STOCK.text },
    ...(input.showValues
      ? [{ text: field.value, y: 46, color: STOCK.muted }]
      : []),
  ];
  return input.showLabels ? (
    <g>
      {labels.map((label) => (
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
      ))}
    </g>
  ) : (
    <path d="M34 18 h284 M34 42 h236" stroke={STOCK.muted} strokeWidth={2} />
  );
}
