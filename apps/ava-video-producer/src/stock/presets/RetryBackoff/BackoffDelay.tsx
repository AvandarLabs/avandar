import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; x: number };
/** Fixed wait values sit outside the proportionally sized brackets. */
export function BackoffDelay({ input, index, x }: Readonly<Props>): ReactNode {
  const attempt = input.attempts[index];
  const waitX = x;
  return (
    <g>
      <FitText
        text={String(attempt.delayAfter)}
        x={waitX}
        y={205}
        width={40}
        maxLines={1}
        fontSize={16}
        normalizeWhitespace
      />
      <FitText
        text={input.delayUnit}
        x={waitX + 50}
        y={205}
        width={200}
        maxLines={2}
        fontSize={14}
        normalizeWhitespace
        breakLongWords
      />
    </g>
  );
}
