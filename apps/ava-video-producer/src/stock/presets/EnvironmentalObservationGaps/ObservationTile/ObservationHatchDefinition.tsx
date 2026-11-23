import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  patternId: string;
};

/** Renders the observation tiledefs in authored paint order. */
export function ObservationHatchDefinition(
  options: Readonly<Props>,
): ReactNode {
  return (
    <defs>
      <pattern
        id={options.patternId}
        width={8}
        height={8}
        patternUnits="userSpaceOnUse"
      >
        <SketchedShape
          shape={{
            kind: "path",
            d: "M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6",
          }}
          profile={options.tokens.sketch.shape}
          stroke={options.tokens.color.inactive}
          strokeWidth={options.scales.stroke(options.tokens.stroke.hairline)}
        />
      </pattern>
    </defs>
  );
}
