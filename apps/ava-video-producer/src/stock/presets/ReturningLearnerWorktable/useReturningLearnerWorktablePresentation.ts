import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReturnSceneFromFrame } from "./getReturnSceneFromFrame";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReturningLearnerWorktable.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  portfolioOffset: number;
  teacherX: number;
  handX: number;
};

/**
 * Returns portfolio, teacher, and hand positions for `ReturnActivities`,
 * `ReturningLearnerWorktable`.
 */
export function useReturningLearnerWorktablePresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { portfolioOffset, teacherX, handX } = getReturnSceneFromFrame({
    frame,
    numActivities: input.returnActivities.length,
    motion,
  });
  return { frame, input, accent, portfolioOffset, teacherX, handX };
}
