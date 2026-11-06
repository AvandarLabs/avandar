import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";
/** Inputs for DrillBreadcrumb. */
type Props = { input: Input };

/** The root and only the supplied selections remain readable at fixed sizes. */
export function DrillBreadcrumb({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.labels.root}
        x={44}
        y={108}
        width={330}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      {input.selectionPath.map((value, index) => (
        <g key={index} data-breadcrumb-level={index + 1}>
          <path
            d={`M${392 + index * 266} 106l6 6-6 6`}
            fill="none"
            stroke={STOCK.muted}
          />
          <LiteralDataText value={value} x={408 + index * 266} y={116} />
        </g>
      ))}
    </g>
  );
}
