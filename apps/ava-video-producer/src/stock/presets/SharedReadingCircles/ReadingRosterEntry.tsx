import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";
type Props = { learner: Input["learners"][number]; index: number };
/** Matches a fixed roster label to the number on its moving reader. */
export function ReadingRosterEntry({
  learner,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SceneText
        text={String(index + 1)}
        color={STOCK.cyan}
        slot={[
          36 + (index % 4) * 230,
          125 + Math.floor(index / 4) * 45,
          20,
          12,
          1,
        ]}
      />
      <SceneText
        text={learner.label}
        slot={[
          62 + (index % 4) * 230,
          125 + Math.floor(index / 4) * 45,
          200,
          12,
          2,
        ]}
      />
    </>
  );
}
