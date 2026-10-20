import { SceneText } from "./SceneText";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Draws the scene's ReadingHeadings group with fixed authored geometry. */
export function ReadingHeadings({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <SceneText
        text={input.labels.books}
        anchor="middle"
        slot={[250, 27, 410, 14, 2]}
      />
      <SceneText
        text={input.labels.class}
        anchor="middle"
        slot={[710, 27, 410, 14, 2]}
      />
      {input.showGroupCounts ? (
        <g>
          <SceneText
            text={String(input.books.length)}
            anchor="middle"
            slot={[250, 78, 410, 24, 1]}
          />
          <SceneText
            text={String(input.learners.length)}
            anchor="middle"
            slot={[710, 78, 410, 24, 1]}
          />
        </g>
      ) : undefined}
      <SceneText
        text={input.labels.readers}
        anchor="middle"
        slot={[480, 103, 850, 14, 1]}
      />
    </>
  );
}
