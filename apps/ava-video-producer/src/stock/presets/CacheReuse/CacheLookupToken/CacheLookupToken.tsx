import { type Props } from "./CacheLookupTokenShared/CacheLookupTokenShared.types";
import { CarriedResult } from "./CarriedResult";
import type { ReactNode } from "react";
/** A request key returns with a result impression only after retrieval. */
export function CacheLookupToken({
  x,
  y,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const hasResult =
    (frame >= 60 && frame <= 92) || (frame >= 120 && frame <= 138);
  return (
    <g>
      <circle
        data-lookup-token={input.request.key}
        cx={x}
        cy={y}
        r={8}
        fill={accent}
      />
      {hasResult ? (
        <CarriedResult x={x} y={y} frame={frame} input={input} />
      ) : undefined}
    </g>
  );
}
