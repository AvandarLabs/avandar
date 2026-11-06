import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode, ComponentProps } from "react";

type Props = { summary: Input["summary"]; accent: string };
/**
 * Fixed-size summary copy reserves its full accepted worst-case line height.
 */
export function SummaryCopy({ summary, accent }: Readonly<Props>): ReactNode {
  const slots: Array<ComponentProps<typeof FitText>> = [
    {
      text: summary.label,
      x: 16,
      y: 28,
      width: 368,
      fontSize: 18,
      maxLines: 3,
      color: accent,
    },
    { text: summary.text, x: 16, y: 96, width: 368, fontSize: 14, maxLines: 7 },
  ];
  return (
    <g data-copy-block="summary" data-bottom={212}>
      {slots.map((slot) => (
        <FitText key={slot.y} {...slot} breakLongWords normalizeWhitespace />
      ))}
    </g>
  );
}
