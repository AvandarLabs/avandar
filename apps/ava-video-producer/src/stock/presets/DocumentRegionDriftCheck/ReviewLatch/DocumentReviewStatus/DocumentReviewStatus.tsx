import { LabelSlots } from "../../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../../DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; matched: boolean; closure: number };
/** Displays the matched or review state as the latch closes. */
export function DocumentReviewStatus({
  input,
  matched,
  closure,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g opacity={closure}>
        <LabelSlots
          labels={[
            [
              matched ? input.labels.matched : input.labels.review,
              52,
              500,
              856,
              18,
              2,
            ],
          ]}
        />
      </g>
    </>
  );
}
