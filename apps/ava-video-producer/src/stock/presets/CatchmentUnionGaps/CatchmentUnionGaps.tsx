import { EASE, ramp } from "../../../motion";
import { CatchmentGeometry } from "./CatchmentGeometry";
import { CatchmentRoster } from "./CatchmentRoster";
import { CatchmentSummary } from "./CatchmentSummary";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
/** Inputs for CatchmentUnionGaps. */
type Props = GraphicProps & { input: Input };

/**
 * Separate catchments fuse around stationary, individually keyed households.
 */
export function CatchmentUnionGaps({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 36, 72, EASE.inOut);
  return (
    <g>
      <CatchmentGeometry
        input={input}
        progress={progress}
        accent={accent}
        id={id}
      />
      <CatchmentRoster input={input} progress={progress} accent={accent} />
      <CatchmentSummary input={input} accent={accent} />
    </g>
  );
}
