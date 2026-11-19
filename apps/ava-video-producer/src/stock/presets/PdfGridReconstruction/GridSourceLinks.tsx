import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getReconstructionColumnXsFromFrame } from "./getReconstructionColumnXsFromFrame";
import { RESULT_CUE } from "./gridTiming";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Source row guides bridge the retained page and its emerging table. */
export function GridSourceLinks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
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
