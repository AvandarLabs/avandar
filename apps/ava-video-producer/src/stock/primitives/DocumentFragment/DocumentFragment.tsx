import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { FitText } from "../FitText/FitText";
import { SketchedShape } from "../SketchedShape";
import type { ReactNode } from "react";

/** The fragment box's own corner, scaled by the theme's corner style. */
const FRAGMENT_CORNER = 5;
/** The accent wash of an emphasized fragment, scaled by tint strength. */
const EMPHASIS_WASH = 0.09;

type Props = {
  x: number;
  y: number;
  width: number;
  text: string;
  emphasized?: boolean;
  /** Defaults to the theme's positive colour. */
  color?: string;
};

/**
 * Draws an authored fragment at a stable anchor with at most two text lines.
 */
export function DocumentFragment({
  x,
  y,
  width,
  text,
  emphasized = false,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  if (![x, y, width].every(Number.isFinite) || width < 100 || width > 800) {
    throw new Error(
      "Document fragments require finite placement and widths from 100 to 800 pixels.",
    );
  }
  const accent = color ?? tokens.color.positive;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={64}
        rx={scales.corner(FRAGMENT_CORNER)}
        fill={emphasized ? accent : tokens.color.surface}
        fillOpacity={emphasized ? scales.wash(EMPHASIS_WASH) : 1}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${y + 64} H${x + width}` }}
        profile={tokens.sketch.shape}
        stroke={emphasized ? accent : tokens.color.line}
        strokeWidth={scales.stroke(
          emphasized ? tokens.stroke.default : tokens.stroke.hairline,
        )}
      />
      <FitText
        x={x + 10}
        y={y + 24}
        width={width - 20}
        text={text}
        fontSize={16}
        maxLines={2}
      />
    </g>
  );
}
