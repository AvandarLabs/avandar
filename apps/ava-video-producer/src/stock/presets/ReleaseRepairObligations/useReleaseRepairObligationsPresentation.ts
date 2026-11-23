import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReleaseRepairObligations.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  isHeld: boolean;
  artifactX: number;
};

/**
 * Returns blocking issue state, artifact position, and theme values for
 * `ReleaseRecipientBay`, `ReleaseDispositionLabel`, `ReleaseRepairObligations`.
 */
export function useReleaseRepairObligationsPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const isHeld = input.issues.some((issue) => {
    return issue.state === "open" && issue.releaseRole === "blocking";
  });
  const artifactX = Motion.mix({
    t: isHeld
      ? 0
      : motion.ramp(frame, 91, motion.scale(39), motion.travel.easing),
    from: 60,
    to: 580,
  });
  return {
    input,
    frame,
    accent,
    tokens,
    atomic,
    motion,
    scales,
    isHeld,
    artifactX,
  };
}
