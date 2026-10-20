import { ramp } from "../../../motion";
import { AliquotCaption } from "./AliquotCaption";
import { AliquotEquation } from "./AliquotEquation";
import { AliquotLedger } from "./AliquotLedger";
import { AliquotTube } from "./AliquotTube";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";
/** Authored sample volumes and explicit frame. */
export type Props = GraphicProps & { input: Input };
/**
 * Splits material into child tubes while retaining a single source identity.
 */
export function SpecimenAliquotBalance({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const transferred = input.aliquots.reduce(
    (total, aliquot, index) =>
      total + aliquot.volume * ramp(frame, 36 + index * 12, 24),
    0,
  );
  return (
    <g opacity={ramp(frame, 12, 18)}>
      <AliquotCaption input={input} />
      <AliquotTube
        tube={input.parent}
        parentId={input.parent.id}
        x={110}
        volume={input.parent.volume - transferred}
        showIdentity={input.showLineage}
        accent={accent}
      />
      {input.aliquots.map((aliquot, index) => (
        <AliquotTube
          key={aliquot.id}
          tube={aliquot}
          parentId={input.parent.id}
          x={250 + index * 130}
          volume={aliquot.volume * ramp(frame, 36 + index * 12, 24)}
          showIdentity={input.showLineage}
          accent={accent}
          isChild
        />
      ))}
      <AliquotLedger input={input} transferred={transferred} />
      {input.showEquation && frame >= 108 ? (
        <AliquotEquation input={input} />
      ) : undefined}
    </g>
  );
}
