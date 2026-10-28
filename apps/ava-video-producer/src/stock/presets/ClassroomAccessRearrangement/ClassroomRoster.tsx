import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Classroom Roster for the authored scene. */
export function ClassroomRoster({ input }: Readonly<Props>): ReactNode {
  return input.learners.map((learner, index) => (
    <g key={learner.id} data-classroom-roster={learner.id}>
      <FitText
        text={String(index + 1)}
        x={735}
        y={142 + index * 60}
        width={24}
        fontSize={14}
        maxLines={1}
        normalizeWhitespace
      />
      <FitText
        text={learner.label}
        x={770}
        y={142 + index * 60}
        width={155}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  ));
}
