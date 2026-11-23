import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./OutreachHouseholdRevisits.schema";

/** Fixed household universe and an ordered authored visit sequence. */
export /** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  completed: Array<{ householdId: string; contacted: boolean }>;
};

/**
 * Returns the completed visit prefix and motion values for
 * `OutreachSceneHeading`, `OutreachMapCaption`, `OutreachHouseholdRevisits`.
 */
export function useOutreachHouseholdRevisitsPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const numCompleted = Math.min(
    input.visits.length,
    Math.max(0, Math.floor(((frame - 36) / 72) * input.visits.length)),
  );
  const completed = input.visits.slice(0, numCompleted);
  return { input, frame, accent, motion, completed };
}
