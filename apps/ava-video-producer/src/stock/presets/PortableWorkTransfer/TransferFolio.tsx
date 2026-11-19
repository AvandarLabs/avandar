import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { FolioCopies } from "./FolioCopies";
import { FolioCover } from "./FolioCover";
import type { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import type { Input } from "./PortableWorkTransfer.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getTransferSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * A single folio keeps its load rigid during travel and opens only if accepted.
 */
export function TransferFolio({
  input,
  scene,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const body = {
    x: scene.folioX,
    y: 198,
    width: 264,
    height: input.artifacts.length * 86 + 10,
    rx: scales.corner(tokens.corner.cell),
    fill: tokens.color.elevated,
    stroke: tokens.color.highlight,
    strokeWidth: scales.stroke(tokens.stroke.default),
  };
  return (
    <g>
      <StockRect data-folio="one" {...body} />
      <SketchedShape
        shape={{ kind: "path", d: `M${scene.folioX + 100} 198 v-14 h50 v14` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <FolioCopies input={input} scene={scene} frame={frame} accent={accent} />
      <FolioCover
        input={input}
        folioX={scene.folioX}
        opening={scene.opening}
        frame={frame}
      />
    </g>
  );
}
