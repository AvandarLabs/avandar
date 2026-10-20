import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import { VisitMark } from "./VisitMark";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Distinct visit categories and the fixed denominator remain explicit. */
export function CohortLegend({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {[
        input.copy.recorded,
        input.copy.missed,
        input.copy.notDue,
        input.copy.unknown,
      ].map((label, index) => (
        <g key={index}>
          <VisitMark
            state={
              (["recorded", "missed", "not-due", "unknown"] as const)[index]
            }
            x={30 + index * 230}
            y={485}
            color={STOCK.text}
          />
          <SceneLabel
            text={label}
            x={22 + index * 230}
            y={510}
            width={215}
            lines={4}
          />
        </g>
      ))}
      {input.showFractions ? (
        <SceneLabel
          text={input.copy.retained}
          x={32}
          y={585}
          width={880}
          lines={1}
        />
      ) : undefined}
    </g>
  );
}
