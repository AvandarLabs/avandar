import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AquiferCaptions. */
type Props = { input: Input };

/**
 * Boundary and period copy delimit the diagram without asserting safe yield.
 */
export function AquiferCaptions({ input }: Readonly<Props>): ReactNode {
  const labels = [
    { text: input.boundary.label, x: 32, y: 28, width: 420, maxLines: 3 },
    {
      text: input.boundary.periodLabel,
      x: 500,
      y: 28,
      width: 428,
      maxLines: 3,
    },
    { text: input.boundary.scopeLabel, x: 32, y: 91, width: 896, maxLines: 1 },
    { text: input.decision.actorLabel, x: 32, y: 128, width: 420, maxLines: 3 },
    {
      text: input.decision.actionLabel,
      x: 500,
      y: 128,
      width: 428,
      maxLines: 3,
    },
    { text: input.copy.unit, x: 740, y: 410, width: 188, maxLines: 1 },
    { text: input.copy.disclaimer, x: 32, y: 589, width: 896, maxLines: 1 },
  ];
  return (
    <g>
      {labels.map(({ text, x, y, width, maxLines }, index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={12}
          maxLines={maxLines}
          breakLongWords
          normalizeWhitespace
        />
      ))}
    </g>
  );
}
