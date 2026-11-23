import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BufferCompass } from "./BufferCompass/BufferCompass";
import { BufferHeadings } from "./BufferHeadings";
import { BufferLocations } from "./BufferLocations";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * Straight-line inclusion separates the complete source set from its results.
 */
export function DistanceBufferEnvelope({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={40}
        y={182}
        width={376}
        height={376}
        fill="none"
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <BufferCompass input={input} frame={frame} accent={accent} />
      <BufferLocations input={input} frame={frame} accent={accent} />
      <BufferHeadings input={input} accent={accent} />
    </g>
  );
}
