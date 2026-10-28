import { FitText } from "../../primitives/FitText/FitText";
import { RevisionDrawer } from "./RevisionDrawer";
import { SavedRevision } from "./SavedRevision";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  selectedIndex: number;
};
/** The complete snapshot history stays fixed beneath the working copy. */
export function RevisionHistory({
  input,
  frame,
  accent,
  selectedIndex,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.statusLabels.history}
        x={40}
        y={370}
        width={880}
        maxLines={1}
        fontSize={16}
        normalizeWhitespace
        breakLongWords
      />
      <RevisionDrawer hasDrawer={input.showStorageDrawer} />
      {input.revisions.map((revision, index) => (
        <SavedRevision
          key={revision.id}
          revision={revision}
          index={index}
          selected={index === selectedIndex}
          frame={frame}
          accent={accent}
          showLabel={input.showVersionLabels}
        />
      ))}
    </g>
  );
}
