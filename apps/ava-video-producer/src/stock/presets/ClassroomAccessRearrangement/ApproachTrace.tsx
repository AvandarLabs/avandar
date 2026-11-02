import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string };
/** Approach Trace for the authored scene. */
export function ApproachTrace({
  input,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  return input.showApproachTrace ? (
    <path
      data-approach-trace="true"
      d="M160 250 V490 H605"
      fill="none"
      stroke={accent}
      strokeWidth={2}
      strokeDasharray="5 7"
      opacity={progress * 0.5}
    />
  ) : undefined;
}
