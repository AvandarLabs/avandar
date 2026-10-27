import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; hasBoard: boolean };
/** Classroom Board Text for the authored scene. */
export function ClassroomBoardText({
  input,
  frame,
  hasBoard,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.activity.boardText}
      x={360}
      y={125}
      width={310}
      fontSize={hasBoard && frame >= 72 ? 16 : 14}
      maxLines={4}
      breakLongWords
      normalizeWhitespace
    />
  );
}
