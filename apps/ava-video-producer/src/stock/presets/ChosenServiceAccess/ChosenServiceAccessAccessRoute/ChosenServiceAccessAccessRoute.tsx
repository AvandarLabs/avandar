import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  doorX: number;
  threshold: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the access route with authored geometry. */
export function ChosenServiceAccessAccessRoute({
  doorX,
  threshold,
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M25 440 H${doorX - 170} L${doorX - 100} 356 L${doorX - 42} ${threshold} H${doorX + 42}`,
      }}
      profile={tokens.sketch.shape}
      data-access-route
      stroke={tokens.color.line}
      fill="none"
      strokeWidth={scales.stroke(tokens.stroke.hairline)}
    />
  );
}
