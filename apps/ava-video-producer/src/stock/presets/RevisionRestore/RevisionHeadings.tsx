import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Artifact and status captions identify current or restored content. */
export function RevisionHeadings({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.artifactLabel}
        x={40}
        y={60}
        width={880}
        maxLines={2}
        fontSize={24}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={
          frame < 126 ? input.statusLabels.current : input.statusLabels.restored
        }
        x={270}
        y={108}
        width={420}
        maxLines={2}
        fontSize={16}
        normalizeWhitespace
        breakLongWords
        color={accent}
      />
    </g>
  );
}
