import { ramp } from "../../../motion";
import { RestoreImpression } from "./RestoreImpression";
import { RevisionDocument } from "./RevisionDocument";
import { RevisionHeadings } from "./RevisionHeadings";
import { RevisionHistory } from "./RevisionHistory";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * A selected saved revision replaces current text while history stays intact.
 */
export function RevisionRestore({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const selectedIndex = input.revisions.findIndex(
    ({ id }) => id === input.restoreRevisionId,
  );
  const selected = input.revisions[selectedIndex];
  const previous = input.revisions.at(-1)!.content;
  const numLines = Math.max(previous.length, selected.content.length);
  const content = Array.from({ length: numLines }, (_, index) =>
    frame >= 78 + ((index + 1) * 48) / numLines
      ? selected.content[index]
      : previous[index],
  );
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <RevisionHeadings input={input} frame={frame} accent={accent} />
      <RevisionDocument
        input={input}
        content={content}
        previous={previous}
        selected={selected.content}
        frame={frame}
        accent={accent}
      />
      <RevisionHistory
        input={input}
        frame={frame}
        accent={accent}
        selectedIndex={selectedIndex}
      />
      <RestoreImpression
        revision={selected}
        index={selectedIndex}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
