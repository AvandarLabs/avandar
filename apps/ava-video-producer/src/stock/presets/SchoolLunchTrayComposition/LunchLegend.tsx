import { FitText } from "../../primitives/FitText/FitText";
import { FoodSymbol } from "./FoodSymbol";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Lunch Legend for the authored scene. */
export function LunchLegend({ input, accent }: Readonly<Props>): ReactNode {
  return input.plannedComponents.map((component, index) => (
    <g
      key={component.id}
      data-plan-key={component.id}
      transform={`translate(${48 + index * 220} 0)`}
    >
      <g transform="translate(12 74)">
        <FoodSymbol symbol={component.symbol} color={accent} />
      </g>
      <FitText
        text={`${index + 1}`}
        x={28}
        y={79}
        width={16}
        fontSize={12}
        maxLines={1}
        normalizeWhitespace
      />
      <FitText
        text={component.label}
        x={48}
        y={69}
        width={164}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  ));
}
