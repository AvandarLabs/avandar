import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCatchmentShapesFromInput } from "./getCatchmentShapesFromInput";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ResolvedVideoAtomic } from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string };
const FOOTPRINT_WIDTH = 1.4;
/** A solid outline, written as a dash so every footprint draws the same way. */
const SOLID_DASH = "1 0";
/** The dash-dot outline of the fourth footprint; no theme step draws it. */
const DASH_DOT = "10 3 2 3";

/**
 * Each footprint keeps its own dash so overlapping outlines stay distinct.
 * The legend swatches use the same dashes.
 */
export function getFootprintDashFromIndex(
  atomic: ResolvedVideoAtomic,
  index: number,
): string | undefined {
  return [
    SOLID_DASH,
    atomic.dash.bold.join(" "),
    atomic.dash.dotted.join(" "),
    DASH_DOT,
  ][index];
}
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
  return (
    <g>
      <g data-separate-tint="" opacity={1 - progress}>
        {shapes.map((shape, index) => {
          return (
            <polygon
              key={shape.id}
              points={shape.points}
              fill={
                [
                  accent,
                  tokens.color.accentAlt,
                  tokens.color.highlight,
                  tokens.color.positive,
                ][index]
              }
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
              stroke={
                [
                  accent,
                  tokens.color.accentAlt,
                  tokens.color.highlight,
                  tokens.color.positive,
                ][index]
              }
              strokeWidth={scales.stroke(FOOTPRINT_WIDTH)}
              strokeDasharray={getFootprintDashFromIndex(atomic, index)}
            />
          );
        })}
      </g>
    </g>
  );
}
