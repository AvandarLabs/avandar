import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PeerContributionRecognition.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  frame: number;
  accent: string;
  focusedX: number;
};
/** Frames the arm takes to point at the object, and later to turn away. */
const ARM_FRAMES = 24;
/** Frames the acknowledgment anchor and the acknowledgment take to appear. */
const ACKNOWLEDGE_FRAMES = 20;
/** Samples the peer's pointing and acknowledgment hand trajectory. */
function _getRecognitionHandPose({
  frame,
  focusedX,
  motion,
}: Readonly<{
  frame: number;
  focusedX: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
}>): { turn: number; handX: number; handY: number } {
  const arm = motion.scale(ARM_FRAMES);
  const point = Motion.ramp({
    frame,
    at: 45,
    dur: arm,
    easing: motion.travel.easing,
  });
  const turn = Motion.ramp({
    frame,
    at: 89,
    dur: arm,
    easing: motion.travel.easing,
  });
  const handX = Motion.mix({
    t: turn,
    from: Motion.mix({ t: point, from: 788, to: focusedX + 80 }),
    to: 195,
  });
  const handY = Motion.mix({
    t: turn,
    from: Motion.mix({ t: point, from: 315, to: 330 }),
    to: 300,
  });
  return { turn, handX, handY };
}

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  focusedX: Options["focusedX"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  acknowledge: number;
  peer: string;
  turn: number;
  handX: number;
  handY: number;
};

/**
 * Returns acknowledgment progress, peer position, and hand placement for
 * `AcknowledgmentAnchor`, `AcknowledgmentBox`, `RecognitionResponse`,
 * `RecognitionExchange`.
 */
export function useRecognitionExchangePresentation({
  input,
  frame,
  accent,
  focusedX,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();

  const acknowledge = motion.scale(ACKNOWLEDGE_FRAMES);
  const peer = tokens.color.accentAlt;
  const { turn, handX, handY } = _getRecognitionHandPose({
    frame,
    focusedX,
    motion,
  });
  return {
    input,
    frame,
    accent,
    focusedX,
    atomic,
    tokens,
    scales,
    motion,
    acknowledge,
    peer,
    turn,
    handX,
    handY,
  };
}
