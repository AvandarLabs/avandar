import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { AliquotCaption } from "./AliquotCaption";
import { AliquotEquation } from "./AliquotEquation";
import { AliquotLedger } from "./AliquotLedger";
import { AliquotTube } from "./AliquotTube";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const motion = useGraphicMotion();
  const transferred = input.aliquots.reduce((total, aliquot, index) => {
    return (
      total +
      aliquot.volume *
        motion.ramp(
          frame,
          36 + index * motion.scaleStagger(12),
          motion.scale(24),
          motion.entrance.easing,
        )
    );
  }, 0);
  return (
    <g opacity={motion.ramp(frame, 12, motion.hero, motion.reveal.easing)}>
      <AliquotCaption input={input} />
      <AliquotTube
        tube={input.parent}
        parentId={input.parent.id}
        x={110}
        volume={input.parent.volume - transferred}
        showIdentity={input.showLineage}
        accent={accent}
      />
      {input.aliquots.map((aliquot, index) => {
        return (
          <AliquotTube
            key={aliquot.id}
            tube={aliquot}
            parentId={input.parent.id}
            x={250 + index * 130}
            volume={
              aliquot.volume *
              motion.ramp(
                frame,
                36 + index * motion.scaleStagger(12),
                motion.scale(24),
                motion.entrance.easing,
              )
            }
            showIdentity={input.showLineage}
            accent={accent}
            isChild
          />
        );
      })}
      <AliquotLedger input={input} transferred={transferred} />
      {input.showEquation && frame >= 108 ? (
        <AliquotEquation input={input} />
      ) : undefined}
    </g>
  );
}
