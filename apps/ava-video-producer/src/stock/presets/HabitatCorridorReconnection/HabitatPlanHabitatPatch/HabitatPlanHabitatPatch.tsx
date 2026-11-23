import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type {
  HabitatPlanPatchRadiusXValue,
  HabitatPlanPatchRadiusYValue,
} from "../HabitatPlan";
import type { ReactNode } from "react";

type Props = {
  index: number;
  patchRadiusX: HabitatPlanPatchRadiusXValue;
  patchRadiusY: HabitatPlanPatchRadiusYValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  patch: Input["patches"][number];
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the habitat patch with authored geometry. */
export function HabitatPlanHabitatPatch({
  index,
  patchRadiusX: PATCH_RADIUS_X,
  patchRadiusY: PATCH_RADIUS_Y,
  tokens,
  patch,
  accent,
  scales,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "ellipse",
        cx: 155 + index * 650,
        cy: 300,
        rx: PATCH_RADIUS_X,
        ry: PATCH_RADIUS_Y,
      }}
      profile={tokens.sketch.shape}
      data-habitat-patch={patch.id}
      fill={accent}
      fillOpacity={scales.wash(atomic.opacity["22"])}
      stroke={accent}
    />
  );
}
