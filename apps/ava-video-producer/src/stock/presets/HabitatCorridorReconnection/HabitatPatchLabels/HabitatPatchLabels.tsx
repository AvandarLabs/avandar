import { HabitatPatchCopy } from "./HabitatPatchCopy/HabitatPatchCopy";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type {
  HabitatPlanPatchRadiusXValue,
  HabitatPlanPatchRadiusYValue,
} from "../HabitatPlan";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  patchRadiusX: HabitatPlanPatchRadiusXValue;
  patchRadiusY: HabitatPlanPatchRadiusYValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the label label with authored geometry. */
export function HabitatPatchLabels({
  input,
  patchRadiusX: PATCH_RADIUS_X,
  patchRadiusY: PATCH_RADIUS_Y,
  tokens,
  accent,
  scales,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <HabitatPatchCopy
        {...{ input, PATCH_RADIUS_X, PATCH_RADIUS_Y, tokens, accent }}
        scales={scales}
        atomic={atomic}
      />
    </>
  );
}
