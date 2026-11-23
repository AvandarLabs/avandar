import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WATER_DESTINATIONS } from "../waterDestinationKeys";
import type { Input } from "../StormwaterStorageSpill.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  progress: number;
  outlets: Array<{
    id: string;
    amount: number;
    path: string;
    x: number;
    color: string;
  }>;
};

/**
 * Returns outlet flow progress, outlet data, and theme values for
 * `WaterOutlets`.
 */
export function useWaterOutletsPresentation({
  input,
  frame,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(
    frame,
    48,
    motion.scale(36),
    motion.travel.easing,
  );
  const outlets = [
    {
      id: "infiltration",
      amount: input.event.infiltratedM3,
      path: "M390 380V403H200",
      x: 130,
      color: tokens.color.categorical[WATER_DESTINATIONS.infiltration.category],
    },
    {
      id: "discharge",
      amount: input.event.dischargedM3,
      path: "M620 360H720V400",
      x: 650,
      color: tokens.color.categorical[WATER_DESTINATIONS.discharge.category],
    },
  ];
  return { input, tokens, scales, progress, outlets };
}
