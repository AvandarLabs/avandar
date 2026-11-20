import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ArrivalGate } from "./ArrivalGate";
import type { Input } from "../ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Numbered depot, receiving gate and branch junction match the label rail. */
export function ConvoyLandmarks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const points = input.routes.find(({ role }) => {
    return role === "blocked";
  })!.points;
  const destination = points.at(-1)!;
  return (
    <g>
      {[points[0], destination, points[1]].map((point, index) => {
        return (
          <text
            key={index}
            x={80 + point.x * 800}
            y={180 + point.y * 280 + 44}
            fill={tokens.color.accentAlt}
            fontFamily={tokens.text.graphic.value.fontFamily}
            fontWeight={tokens.text.graphic.value.fontWeight}
            fontSize={tokens.text.graphic.value.fontSize}
            textAnchor="middle"
          >
            {index + 1}
          </text>
        );
      })}
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${80 + points[0].x * 800 - 20} ${180 + points[0].y * 280 - 22} v-20 l20 -15 l20 15 v20 Z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.accentAlt}
      />
      <ArrivalGate destination={destination} frame={frame} accent={accent} />
    </g>
  );
}
