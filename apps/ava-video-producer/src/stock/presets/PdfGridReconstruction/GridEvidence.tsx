import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getEvidenceFromFrame } from "./getEvidenceFromFrame";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={getEvidenceFromFrame({ frame, motion })}>
      <TaggedGridEvidence input={input} frame={frame} accent={accent} />
      <RuledGridEvidence input={input} frame={frame} accent={accent} />
      <WhitespaceGridEvidence input={input} frame={frame} accent={accent} />
    </g>
  );
}
