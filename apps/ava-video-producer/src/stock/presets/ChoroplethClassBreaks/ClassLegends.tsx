import { ClassLegend } from "./ClassLegend";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Each supplied scale owns its ranges, measure unit and missing-state key. */
export function ClassLegends({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.schemes.map((scheme, index) => {
        return (
          // prettier-ignore
          // The schema fixes exactly two schemes in before/after
          // order. A legend belongs to that comparison slot, not
          // its editable label.
          // react-doctor-disable-next-line no-array-index-as-key
          <ClassLegend key={index}
            {...{ scheme, index, accent }}
            unitLabel={input.unitLabel}
            noDataLabel={input.noDataLabel}
          />
        );
      })}
    </g>
  );
}
