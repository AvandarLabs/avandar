import { EASE, ramp } from "../../../motion";
import { FoundationCopy } from "./FoundationCopy";
import { FoundationSlabs } from "./FoundationSlabs";
import { FoundationSupports } from "./FoundationSupports";
import type { Props } from "./SharedFoundation";
import type { ReactNode } from "react";
/** Two revealed pieces join, or one continuous base is uncovered intact. */
export function FoundationBase({
  frame,
  accent,
  input,
  id,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  const joining = ramp(frame, 72, 36, EASE.inOut);
  const reveal = ramp(frame, 48, 24);
  const clipId = `${id}-foundation-reveal`;
  return (
    <g>
      <FoundationSupports
        {...{ ...remainingProps, frame, accent, input, id }}
      />
      <defs>
        <clipPath id={clipId}>
          <FoundationSlabs
            frame={frame}
            variant={input.foundationReveal}
            isMask
          />
        </clipPath>
      </defs>
      <g opacity={reveal}>
        <FoundationSlabs
          frame={frame}
          variant={input.foundationReveal}
          isMask={false}
        />
        <g clipPath={`url(#${clipId})`}>
          <FoundationCopy input={input} />
        </g>
        <path
          d="M80 550 H880"
          stroke={accent}
          strokeWidth={3}
          opacity={joining}
        />
      </g>
    </g>
  );
}
