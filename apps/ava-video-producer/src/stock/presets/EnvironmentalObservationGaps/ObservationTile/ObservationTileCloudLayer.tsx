import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  lift: number;
};

/** Renders the observation tile cloud layer in authored paint order. */
export function ObservationTileCloudLayer(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-cloud-layer="true"
      opacity={1 - options.lift}
      transform={`translate(0 ${-14 * options.lift})`}
    >
      <rect
        x={270}
        y={105}
        width={650}
        height={300}
        rx={options.scales.corner(options.tokens.corner.panel)}
        fill={options.tokens.color.elevated}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M 285 170 Q 350 130 415 170 T 675 170 T 905 170 M 285 290 Q 350 250 415 290 T 675 290 T 905 290",
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.inactive}
        strokeWidth={options.scales.stroke(12)}
        fill="none"
      />
    </g>
  );
}
