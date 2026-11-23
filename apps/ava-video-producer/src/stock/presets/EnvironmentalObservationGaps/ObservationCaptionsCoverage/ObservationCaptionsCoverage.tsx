import { ObservationCoverageTotal } from "../ObservationCoverageTotal/ObservationCoverageTotal";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  observed: number;
  missing: number;
};

/** Renders the coverage with authored geometry. */
export function ObservationCaptionsCoverage({
  input,
  observed,
  missing,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showCoverageTotals ? (
        <g
          data-coverage="true"
          data-observed-area={observed}
          data-missing-area={missing}
        >
          {[
            { role: "observed", label: input.copy.observed, value: observed },
            { role: "missing", label: input.copy.missing, value: missing },
          ].map(({ role, label, value }, index) => {
            return (
              <ObservationCoverageTotal
                key={role}
                {...{ role, label, index, value, input }}
              />
            );
          })}
        </g>
      ) : undefined}
    </>
  );
}
