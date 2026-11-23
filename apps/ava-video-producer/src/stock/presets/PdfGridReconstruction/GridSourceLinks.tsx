import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RESULT_CUE } from "./getEvidenceFromFrame";
import { getReconstructionColumnXsFromFrame } from "./getReconstructionColumnXsFromFrame";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Source row guides bridge the retained page and its emerging table. */
export function GridSourceLinks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const resultX = getReconstructionColumnXsFromFrame({
    input,
    frame,
    isResult: true,
    motion,
  })[0];
  return (
    <g>
      {" "}
      {input.showSourceLinks && frame >= RESULT_CUE
        ? input.grid.rows.map((_, rowIndex) => {
            return (
              <g key={rowIndex} data-source-link={rowIndex}>
                <SketchedShape
                  shape={{
                    kind: "path",
                    d: `M452 ${322 + rowIndex * 64} H${resultX}`,
                  }}
                  profile={tokens.sketch.shape}
                  stroke={accent}
                  strokeDasharray={atomic.dash.dotted.join(" ")}
                  fill="none"
                />
              </g>
            );
          })
        : undefined}
    </g>
  );
}
