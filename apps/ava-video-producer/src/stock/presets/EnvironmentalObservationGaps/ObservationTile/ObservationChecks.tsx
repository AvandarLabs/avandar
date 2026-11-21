import { Text } from "../../../graphics-common/Text";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { makeObservationLayoutFromInput } from "../makeObservationLayoutFromInput";
import type { ReactNode } from "react";

/** Inputs for ObservationTile. */
type ParentProps = {
  frame: number;
  accent: string;
  id: string;
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  checks: ReturnType<typeof makeObservationLayoutFromInput>["checks"];
};

/** Renders the observation checks in authored paint order. */
export function ObservationChecks(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.checks.map((check, index) => {
        return options.frame >= 70 + index * 18 ? (
          <g key={check.id}>
            <SketchedShape
              shape={{ kind: "circle", cx: check.x, cy: check.y, r: 5 }}
              profile={options.tokens.sketch.shape}
              data-point-check={check.id}
              fill={options.tokens.color.highlight}
              stroke={options.tokens.color.ground}
              strokeWidth={options.scales.stroke(
                options.tokens.stroke.hairline,
              )}
            />
            <Text
              x={check.x + 8}
              y={check.y + 4}
              role="data"
              fill={options.tokens.color.highlight}
            >
              {check.key}
            </Text>
          </g>
        ) : undefined;
      })}
    </>
  );
}
