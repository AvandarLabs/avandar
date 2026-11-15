import { ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Header and fingerprint tags have independent, exact comparison strokes. */
export function ComparisonTags({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LiteralDataText value={input.saved.header} x={52} y={416} />
      <LiteralDataText value={input.current.header} x={508} y={416} />
      <LiteralDataText value={input.saved.fingerprint} x={52} y={450} />
      <LiteralDataText value={input.current.fingerprint} x={508} y={450} />
      <path
        d="M456 412 h36"
        stroke={
          input.saved.header === input.current.header ? accent : STOCK.orange
        }
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - ramp(frame, 51, 22)}
      />
      <path
        d="M456 446 h36"
        stroke={
          input.saved.fingerprint === input.current.fingerprint
            ? accent
            : STOCK.orange
        }
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - ramp(frame, 78, 22)}
      />
    </g>
  );
}
