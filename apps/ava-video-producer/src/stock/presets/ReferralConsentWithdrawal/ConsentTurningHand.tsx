import { propEq, prop } from "@avandar/utils";
import { ramp } from "../../../motion";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Hand contact follows the edge of the actively turning slip. */
export function ConsentTurningHand({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const withdrawn = input.permissions.filter(prop("withdrawn"));
  const activeIndex = Math.min(
    withdrawn.length - 1,
    Math.max(0, Math.floor((frame - 36) / 8)),
  );
  const activeTurn = ramp(frame, 36 + activeIndex * 8, 8);
  const handX = 278 + 230 * (0.12 + 0.88 * Math.abs(2 * activeTurn - 1));
  const targetIndex = input.permissions.findIndex(
    propEq("id", withdrawn[activeIndex]?.id),
  );
  return frame >= 36 && frame < 60 ? (
    <path
      data-participant-hand="turn"
      d={`M200 150 L${handX} ${190 + targetIndex * 102 + 45}`}
      fill="none"
      stroke={accent}
      strokeWidth={4}
      strokeLinecap="round"
    />
  ) : undefined;
}
