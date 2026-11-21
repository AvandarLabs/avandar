import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PdfNearestLabelReview.schema";
import type { ReviewTiming } from "../ReviewTiming";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  index: number;
  frame: number;
};

type Props = {
  index: Readonly<ParentProps>["index"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  label: Readonly<ParentProps>["input"]["labels"][number];
  figureX: number;
  figureY: number;
  distance: ReturnType<typeof ReviewTiming.getMeasureFromFrame>;
  x: number;
  y: number;
  color:
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["accentAlt"]
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["highlight"];
};

/**
 * Renders the candidate anchor guides distance guide in authored paint order.
 */
export function CandidateAnchorGuidesDistanceGuide(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g data-distance-guide={options.label.id}>
      <SketchedShape
        shape={{
          kind: "line",
          x1: options.figureX,
          y1: options.figureY,
          x2: Motion.mix({
            t: options.distance,
            from: options.figureX,
            to: options.x,
          }),
          y2: Motion.mix({
            t: options.distance,
            from: options.figureY,
            to: options.y,
          }),
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.color}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
        strokeDasharray={
          options.index === 0 ? undefined : options.atomic.dash.tight.join(" ")
        }
      />
    </g>
  );
}
