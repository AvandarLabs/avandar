import { mix } from "../../../motion";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";
/** Inputs for PremiseSupport. */
type Props = {
  joining: number;
  center: number;
  x: number;
  slotWidth: number;
  accent: string;
  premise: Input["premises"][number];
  showSupport: boolean;
  relationship: Input["relationship"];
};

/**
 * Joining arms connect one premise to the deck, with an optional center post.
 */
export function PremiseSupport({
  joining,
  center,
  x,
  slotWidth,
  accent,
  premise,
  showSupport,
  relationship,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <path
        data-premise-join={premise.id}
        d={`M${center} 410 V390 M${center} 390 H${mix(joining, center, x + 4)} V${mix(joining, 390, 350)} M${center} 390 H${mix(joining, center, x + slotWidth - 4)} V${mix(joining, 390, 350)}`}
        stroke={accent}
        strokeWidth={3}
        fill="none"
        strokeDasharray={relationship === "suggests" ? "8 7" : undefined}
        opacity={joining}
      />
      {showSupport ? (
        <line
          data-individual-support={premise.id}
          x1={center}
          y1={390}
          x2={center}
          y2={mix(joining, 390, 350)}
          stroke={accent}
          strokeWidth={3}
          strokeDasharray={relationship === "suggests" ? "8 7" : undefined}
        />
      ) : null}
    </>
  );
}
