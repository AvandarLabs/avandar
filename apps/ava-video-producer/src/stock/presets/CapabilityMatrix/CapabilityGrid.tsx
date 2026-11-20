import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CapabilityColumn } from "./CapabilityColumn";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/** The table panel's corner before the corner style scales it. */
const PANEL_CORNER = 8;
/** The table skeleton establishes shared row and column geometry first. */
export function CapabilityGrid({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const height = input.capabilities.length * 66;
  const panel = {
    x: 54,
    y: 176,
    width: 854,
    height,
    rx: scales.corner(PANEL_CORNER),
  };
  const caption = {
    text: input.caption,
    x: 480,
    y: 48,
    width: 840,
    fontSize: 24 as const,
    maxLines: 2,
  };
  return (
    <g>
      <g
        aria-label={input.caption}
        opacity={ramp(frame, 12, motion.hero, motion.reveal.easing)}
      >
        <FitText
          {...caption}
          breakLongWords
          normalizeWhitespace
          anchor="middle"
        />
      </g>
      <g opacity={ramp(frame, 18, motion.hero, motion.reveal.easing)}>
        <StockRect
          {...panel}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
        {input.options.map((option, index) => {
          return (
            <CapabilityColumn
              key={option.id}
              {...{ option, index, height }}
              columnWidth={606 / input.options.length}
            />
          );
        })}
        {input.capabilities.map((row, index) => {
          return (
            <SketchedShape
              key={row.id}
              shape={{
                kind: "line",
                x1: 54,
                x2: 908,
                y1: 176 + index * 66,
                y2: 176 + index * 66,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
            />
          );
        })}
      </g>
    </g>
  );
}
