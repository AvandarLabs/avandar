import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../TeacherLearningCover.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  role: keyof Input["staff"];
  person: Input["staff"]["teacher"];
  x: number;
  frame: number;
  mode: Input["session"]["mode"];
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  role: Options["role"];
  person: Options["person"];
  x: Options["x"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  practicing: boolean;
  handX: number;
};

/**
 * Returns practice state, hand position, and staff theme values for
 * `CoverStaff`, `TeachingHand`.
 */
export function useCoverStaffPresentation({
  role,
  person,
  x,
  frame,
  mode,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const practicing = frame >= 72 && frame <= 104;
  const gesture =
    mode === "rehearsal"
      ? Math.sin(
          motion.ramp(frame, 72, motion.scale(32), motion.entrance.easing) *
            Math.PI *
            2,
        ) * 15
      : motion.ramp(frame, 72, motion.scale(32), motion.entrance.easing) * 28;
  const handX = role === "teacher" ? 700 + gesture : 810 - gesture;
  return { role, person, x, accent, tokens, scales, practicing, handX };
}
