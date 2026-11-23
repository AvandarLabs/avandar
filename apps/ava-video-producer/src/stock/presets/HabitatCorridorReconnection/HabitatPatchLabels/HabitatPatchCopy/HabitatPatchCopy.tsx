import { HabitatPlanHabitatPatch } from "../../HabitatPlanHabitatPatch/HabitatPlanHabitatPatch";
import { HabitatPatchLabelRail } from "./HabitatPatchLabelRail/HabitatPatchLabelRail";
import type { GraphicThemeHooks } from "../../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../../HabitatCorridorReconnection.schema";
import type {
  HabitatPlanPatchRadiusXValue,
  HabitatPlanPatchRadiusYValue,
} from "../../HabitatPlan";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  PATCH_RADIUS_X: HabitatPlanPatchRadiusXValue;
  PATCH_RADIUS_Y: HabitatPlanPatchRadiusYValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};
/** Pairs each habitat patch with its original label and area. */
export function HabitatPatchCopy({
  input,
  PATCH_RADIUS_X,
  PATCH_RADIUS_Y,
  tokens,
  accent,
  scales,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.patches.map((patch, index) => {
        return (
          <g key={patch.id}>
            <HabitatPlanHabitatPatch
              index={index}
              patchRadiusX={PATCH_RADIUS_X}
              patchRadiusY={PATCH_RADIUS_Y}
              {...{ tokens, patch, accent, scales, atomic }}
            />
            <HabitatPatchLabelRail patch={patch} index={index} />
          </g>
        );
      })}
    </>
  );
}
