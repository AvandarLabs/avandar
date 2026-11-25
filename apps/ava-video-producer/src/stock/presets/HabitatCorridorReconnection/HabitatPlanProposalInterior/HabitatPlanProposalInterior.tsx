import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { makeCorridorRouteFromInputAndFrame } from "../makeCorridorRouteFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  path: ReturnType<typeof makeCorridorRouteFromInputAndFrame>["path"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  background:
    | NonNullable<string | undefined>
    | ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"]["ground"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the proposal interior with authored geometry. */
export function HabitatPlanProposalInterior({
  input,
  path,
  tokens,
  background,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.decision.stage === "proposal" ? (
        <SketchedShape
          shape={{ kind: "path", d: path }}
          profile={tokens.sketch.shape}
          data-proposal-interior="true"
          stroke={background}
          strokeWidth={scales.stroke(22)}
          strokeLinejoin="round"
          fill="none"
        />
      ) : undefined}
    </>
  );
}
