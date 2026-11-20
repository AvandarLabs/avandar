import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCatchmentShapesFromInput } from "./getCatchmentShapesFromInput";
import { getFootprintDashFromIndex } from "./getFootprintDashFromIndex";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string };
const FOOTPRINT_WIDTH = 1.4;
/** Each original service footprint retains its authored outline toggle. */
export function IndividualFootprints({
  input,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const scales = useGraphicShapeScales();
  const shapes = getCatchmentShapesFromInput(input);
  const colors = _getFootprintColors(accent, tokens);
  return (
    <g>
      <g data-separate-tint="" opacity={1 - progress}>
        {shapes.map((shape, index) => {
          return (
            <polygon
              key={shape.id}
              points={shape.points}
              fill={colors[index]}
              fillOpacity={tokens.alpha.ghost}
            />
          );
        })}
      </g>
      <g
        data-original-outlines=""
        opacity={input.showOriginalOutlines ? 1 : 1 - progress}
      >
        {shapes.map((shape, index) => {
          return (
            <SketchedShape
              key={shape.id}
              shape={{ kind: "path", d: `M${shape.points}Z` }}
              profile={tokens.sketch.shape}
              fill="none"
              stroke={colors[index]}
              strokeWidth={scales.stroke(FOOTPRINT_WIDTH)}
              strokeDasharray={getFootprintDashFromIndex(atomic, index)}
            />
          );
        })}
      </g>
    </g>
  );
}

/** One colour per footprint, in the order the input lists them. */
function _getFootprintColors(
  accent: string,
  tokens: ReturnType<typeof useGraphicTokens>,
): readonly string[] {
  return [
    accent,
    tokens.color.accentAlt,
    tokens.color.highlight,
    tokens.color.positive,
  ];
}
