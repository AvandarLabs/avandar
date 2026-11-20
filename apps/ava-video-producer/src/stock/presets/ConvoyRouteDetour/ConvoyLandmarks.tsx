import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Numbered depot, receiving gate and branch junction match the label rail. */
export function ConvoyLandmarks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
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

/** The receiving gate, its arm lifting for the convoy, with its keeper. */
function ArrivalGate({
  destination,
  frame,
  accent,
}: Readonly<{
  destination: Readonly<{ x: number; y: number }>;
  frame: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-gate="arrival"
      transform={`translate(${80 + destination.x * 800} ${180 + destination.y * 280})`}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M-25 -28 V-52 M25 -28 V-52 M-25 -40 L${25 - 42 * motion.reveal(frame, 114)} ${-40 - 28 * motion.reveal(frame, 114)}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <PersonGlyph x={42} y={-40} size={30} color={tokens.color.accentAlt} />
    </g>
  );
}
