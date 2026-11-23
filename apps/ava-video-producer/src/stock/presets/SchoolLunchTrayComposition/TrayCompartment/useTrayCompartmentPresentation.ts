import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchoolLunchTrayComposition.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  component: Input["plannedComponents"][number];
  frame: number;
  index: number;
  isServed: boolean;
  showNames: boolean;
  emphasize: boolean;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  component: Options["component"];
  frame: Options["frame"];
  index: Options["index"];
  isServed: Options["isServed"];
  showNames: Options["showNames"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  foodY: number;
  outlineEmphasis: number;
};

/**
 * Returns food placement, outline emphasis, and theme values for
 * `TrayCompartmentBody`, `TrayCompartment`.
 */
export function useTrayCompartmentPresentation({
  component,
  frame,
  index,
  isServed,
  showNames,
  emphasize,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(
    frame,
    36 + index * motion.scaleStagger(12),
    motion.scale(12),
    motion.travel.easing,
  );
  const foodY = Motion.mix({ t: progress, from: -16, to: 34 });
  const outlineEmphasis =
    !isServed && emphasize
      ? motion.ramp(frame, 88, motion.press.duration, motion.travel.easing) *
        (1 -
          motion.ramp(frame, 100, motion.press.duration, motion.travel.easing))
      : 0;
  return {
    component,
    frame,
    index,
    isServed,
    showNames,
    accent,
    tokens,
    scales,
    foodY,
    outlineEmphasis,
  };
}
