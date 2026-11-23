import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getCargoPositionFromInputAndFrame } from "../getCargoPositionFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  position: ReturnType<typeof getCargoPositionFromInputAndFrame>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the mechanism with authored geometry. */
export function CargoParcelMechanism({
  position,
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {position.mechanism ? (
        <g data-mechanism={position.mechanism}>
          <SketchedShape
            shape={{
              kind: "path",
              d:
                position.mechanism === "hoist"
                  ? `M${position.x} 175 V${position.y - 17}`
                  : `M${position.x - 20} ${position.y + 20} h40 l5 -10`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.inactive}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
          {position.mechanism === "handcart" ? (
            <circle
              cx={position.x}
              cy={position.y + 25}
              r={4}
              fill={tokens.color.inactive}
            />
          ) : undefined}
        </g>
      ) : undefined}
    </>
  );
}
