import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** The source review bracket stays outside the active transfer interval. */
export function TypeReviewBracket({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 56, 44);
  return frame >= 101 && frame < 139 ? undefined : (
    <path
      data-review-bracket=""
      d={`M 414 225 h 14 v ${(input.values.length * 50 - 8) * progress} h -14`}
      fill="none"
      stroke={STOCK.orange}
      strokeWidth={2}
      opacity={progress}
    />
  );
}
