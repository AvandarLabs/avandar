import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getFootprintDashFromIndex } from "./getFootprintDashFromIndex";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
/** Inputs for CatchmentNames. */
type Props = { input: Input; accent: string };

/** Matched line swatches identify up to four authored service footprints. */
export function CatchmentNames({ input, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {input.catchments.map((catchment, index) => {
        return (
          <g key={catchment.id}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: 40 + index * 230,
                y1: 78,
                x2: 68 + index * 230,
                y2: 78,
              }}
              profile={tokens.sketch.shape}
              stroke={
                [
                  accent,
                  tokens.color.accentAlt,
                  tokens.color.highlight,
                  tokens.color.positive,
                ][index]
              }
              strokeWidth={scales.stroke(tokens.stroke.emphasis)}
              strokeDasharray={getFootprintDashFromIndex(atomic, index)}
            />
            <LabelSlots
              labels={[[catchment.label, 40 + index * 230, 97, 210, 12, 3]]}
            />
          </g>
        );
      })}
    </g>
  );
}
