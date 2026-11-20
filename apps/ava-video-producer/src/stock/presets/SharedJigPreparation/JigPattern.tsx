import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  pattern: Input["guide"]["pattern"];
  progress?: number;
  isGuide?: boolean;
  color: string;
};
/** The selected categorical pattern cuts the guide or marks its workpiece. */
export function JigPattern({
  x,
  y,
  pattern,
  progress = 1,
  isGuide = false,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const radius = 7 * progress;
  const body = `M${x} ${y} h100 v64 h-100 Z`;
  const holes = [30, 70]
    .map((offset) => {
      return `M${x + offset - radius} ${y + 32} a${radius} ${radius} 0 1 0 ${radius * 2} 0 a${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
    })
    .join(" ");
  const notch = `M${x} ${y} h${22 * progress} v${22 * progress} h${-22 * progress} Z`;
  return (
    <g>
      {isGuide ? (
        <g fillRule="evenodd">
          <SketchedShape
            shape={{
              kind: "path",
              d: `${body} ${pattern === "two-holes" ? holes : notch}`,
            }}
            profile={tokens.sketch.shape}
            data-guide-body="true"
            fill={tokens.color.elevated}
            stroke={color}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
        </g>
      ) : undefined}
      {pattern === "two-holes" ? (
        [30, 70].map((offset) => {
          return (
            <SketchedShape
              key={offset}
              shape={{ kind: "circle", cx: x + offset, cy: y + 32, r: radius }}
              profile={tokens.sketch.shape}
              data-hole-mark="true"
              fill={isGuide ? "none" : color}
              stroke={color}
            />
          );
        })
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${y + 22 * progress} h${22 * progress} v${-22 * progress}`,
          }}
          profile={tokens.sketch.shape}
          data-corner-mark="true"
          fill="none"
          stroke={color}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      )}
    </g>
  );
}
