import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";
/** The review's title over the field the candidates are compared on. */
export function ReviewHeadings({
  input,
}: Readonly<{ input: Input }>): ReactNode {
  return (
    <>
      <FitText
        text={input.title}
        x={44}
        y={50}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.comparisonFieldLabel}
        x={44}
        y={110}
        width={872}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
