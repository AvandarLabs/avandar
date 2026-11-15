import { ramp } from "../../../motion";
import { RuledGridEvidence } from "./RuledGridEvidence";
import { TaggedGridEvidence } from "./TaggedGridEvidence";
import { WhitespaceGridEvidence } from "./WhitespaceGridEvidence";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Tagged outlines, ruling lines and whitespace corridors remain distinct. */
export function GridEvidence({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 13, 42)}>
      <TaggedGridEvidence input={input} frame={frame} accent={accent} />
      <RuledGridEvidence input={input} frame={frame} accent={accent} />
      <WhitespaceGridEvidence input={input} frame={frame} accent={accent} />
    </g>
  );
}
