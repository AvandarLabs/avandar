import { SketchedShape } from "../../../primitives/SketchedShape";
import { HabitatPlanProposalInterior } from "../HabitatPlanProposalInterior/HabitatPlanProposalInterior";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { makeCorridorRouteFromInputAndFrame } from "../makeCorridorRouteFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  laid: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
  path: ReturnType<typeof makeCorridorRouteFromInputAndFrame>["path"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  input: Input;
  background:
    | NonNullable<string | undefined>
    | ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"]["ground"];
  crossing: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
};

/** Renders the corridor route with authored geometry. */
export function HabitatPlanCorridorRoute({
  laid,
  path,
  tokens,
  accent,
  scales,
  input,
  background,
  crossing,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={laid}>
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        data-corridor-route="true"
        stroke={accent}
        strokeWidth={scales.stroke(26)}
        strokeLinejoin="round"
        fill="none"
      />
      <HabitatPlanProposalInterior
        {...{ input, path, tokens, background, scales }}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M 440 ${300 - 50 * crossing + 18} V 325 M 520 ${300 - 50 * crossing + 18} V 325`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
    </g>
  );
}
