import { ClassLegend } from "./ClassLegend";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/** Each supplied scale owns its ranges, measure unit and missing-state key. */
export function ClassLegends({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.schemes.map((scheme, index) => (
        <ClassLegend
          key={index}
          {...{ scheme, index, accent }}
          unitLabel={input.unitLabel}
          noDataLabel={input.noDataLabel}
        />
      ))}
    </g>
  );
}
