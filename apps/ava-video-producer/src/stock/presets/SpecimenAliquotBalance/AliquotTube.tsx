import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { AliquotTubeLabels } from "./AliquotTubeLabels";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";

/** How strongly the liquid in a tube shows. */
const LIQUID_OPACITY = 0.7;
type Props = {
  tube: Input["parent"];
  parentId: string;
  x: number;
  volume: number;
  showIdentity: boolean;
  accent: string;
  isChild?: boolean;
};
/**
 * Equal-width tubes encode the same material scale, including empty parents.
 */
export function AliquotTube({
  tube,
  parentId,
  x,
  volume,
  showIdentity,
  accent,
  isChild = false,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {showIdentity && isChild ? (
        <g data-lineage={tube.id}>
          <SketchedShape
            shape={{ kind: "path", d: `M110 148 V126 H${x} V148` }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
            fill="none"
          />
        </g>
      ) : undefined}
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x - 25} 148 V262 Q${x - 25} 278 ${x} 278 Q${x + 25} 278 ${x + 25} 262 V148 Z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <rect
        data-liquid-id={tube.id}
        data-parent-id={parentId}
        x={x - 20}
        y={270 - volume * 9}
        width={40}
        height={volume * 9}
        fill={accent}
        opacity={LIQUID_OPACITY}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x - 29} 146 H${x + 29}` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(7)}
      />
      <AliquotTubeLabels
        tube={tube}
        x={x}
        volume={volume}
        showIdentity={showIdentity}
      />
    </g>
  );
}
