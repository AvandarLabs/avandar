import { AbsoluteFill, useCurrentFrame } from "remotion";
// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { AppFrame } from "../../chrome/chrome";
import { Motion } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../videoTheme/videoThemeHelpers";
import { DemoCursor } from "./DemoCursor";
import { PromptField } from "./PromptField";
import { PublishButton } from "./PublishButton";
import { ResultsPanel } from "./ResultsPanel/ResultsPanel";
import { SidePanel } from "./SidePanel/SidePanel";
import {
  APP_IN,
  CHIP_CLICK,
  COUNT_AT,
  FIELD_CLICK,
  OUT_AT,
  PROMPT,
  REFILTER_AT,
  RUN_CLICK,
  TOTAL_ALL,
  TOTAL_PAID,
  TYPE_AT,
  W,
} from "./timeline";
import type { VideoMotion } from "../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { ReactNode } from "react";

export { DEMO_LEN } from "./timeline";
function _getMatchedCount({
  frame,
  motion,
  stateEasing,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
  stateEasing: (progress: number) => number;
}>): number {
  return Math.round(
    Motion.mix({
      t: motion.ramp(frame, COUNT_AT, motion.sheet, stateEasing),
      from: 0,
      to: MATCHED_ALL,
    }),
  );
}
/** Frames the app takes to fade out at the end of the clip, at tempo 1. */
const APP_OUT_FRAMES = 20;
/** The matched-rows figure the counter lands on before the filter. */
const MATCHED_ALL = 1940;
/** The matched-rows figure after the filter. */
const MATCHED_PAID = 312;
/** The counters of one frame: matched rows, the filter ramp, and the total. */
function _counts({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): Readonly<{ shown: number; refilter: number; totalShown: number }> {
  const stateEasing = motion.reveal.easing;
  // Two counters in sequence. The first counts up from nothing when the
  // results land; the second travels from that value to the filtered one
  // when the chip is clicked. A number that jumps between the two is the
  // loudest teleport on screen, because the eye is already reading it.
  const matched = _getMatchedCount({ frame, motion, stateEasing });
  const refilter = motion.ramp(frame, REFILTER_AT, motion.sheet, stateEasing);
  const shown =
    frame < REFILTER_AT
      ? matched
      : Math.round(
          Motion.mix({
            t: refilter,
            from: MATCHED_ALL,
            to: MATCHED_PAID,
          }),
        );
  // The filter has to act on the thing it filters. A chip lighting up while
  // five channels sit there untouched, Organic search among them, under a
  // "Paid only" filter, is the clip contradicting itself, and it does it in
  // the frame the poster gets cut from. The excluded rows dim and their bars
  // retract; the total recounts to the paid subset.
  const totalShown =
    frame < REFILTER_AT
      ? TOTAL_ALL
      : Math.round(
          Motion.mix({
            t: refilter,
            from: TOTAL_ALL,
            to: TOTAL_PAID,
          }),
        );
  return { shown, refilter, totalShown };
}
/** The beat values of one frame: what is visible, typed, and counted. */
function useDemoBeats(frame: number) {
  const motion = useVideoMotion();
  const appearEasing = motion.entrance.easing;
  const stateEasing = motion.reveal.easing;
  // The app arrives and leaves on opacity only. Never a transform on this
  // container: it holds the whole UI, and a scale on it resamples every
  // glyph inside. Opacity is safe: it composites.
  const appIn = motion.ramp(frame, APP_IN, motion.sheet, appearEasing);
  const appOut =
    1 - motion.ramp(frame, OUT_AT, motion.scale(APP_OUT_FRAMES), appearEasing);
  const app = Math.min(appIn, appOut);
  // Focus arrives on the click and leaves again on Run. A field that stays
  // lit for the rest of the clip, caret still blinking while the pointer is
  // across the screen pressing something else, reads as a mock-up: real
  // software answers the pointer, and the eye knows what a focus ring means.
  const focus =
    motion.ramp(frame, FIELD_CLICK, motion.chip, stateEasing) *
    (1 - motion.ramp(frame, RUN_CLICK, motion.chip, stateEasing));
  const text = Motion.typed({
    frame,
    at: TYPE_AT,
    text: PROMPT,
    cps: motion.typing.rate,
  });
  const typing = text.length > 0 && text.length < PROMPT.length;
  const { shown, refilter, totalShown } = _counts({ frame, motion });
  const chipOn = motion.ramp(frame, CHIP_CLICK, motion.chip, stateEasing);
  return { app, focus, text, typing, shown, refilter, totalShown, chipOn };
}
/**
 * The worked example, and the reference: to shoot a new clip, copy this
 * structure and change the flow, not the pipeline.
 *
 * `leave()` is the one helper in motion.ts this file does not reach for, and
 * that is not an oversight. It returns a transform, and the only thing
 * leaving here is the container holding the whole UI, which must never carry
 * a lasting transform: scaling it resamples every glyph inside. It is for
 * elements inside a phase, never the phase.
 *
 * The flow it walks is deliberately generic: type a query, get results,
 * filter them, publish. Replace it with the real steps of your own product,
 * in the real order, with copy taken from the live UI. That is the one
 * defect that cannot be fixed in the edit: a demo that walks a flow the
 * product does not have proves nothing, however good it looks.
 *
 * Read the beat sheet in `./timeline` before changing a number. Every click,
 * entrance and colour change is anchored to an absolute frame, and they are
 * tuned against each other: the pointer arrives before it clicks, the panel
 * answers after the click, the counter finishes before the eye leaves it.
 *
 * Colour, type, and timing come from the video theme: the scene palette, the
 * app text roles, and themed motion. Draw it inside a theme (`starter` in
 * Remotion Studio, the film's theme in the showcase).
 */
export function Demo(): ReactNode {
  const frame = useCurrentFrame();
  const tokens = useVideoTokens();
  const { app, focus, text, typing, shown, refilter, totalShown, chipOn } =
    useDemoBeats(frame);
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground }}>
      <AbsoluteFill
        style={{
          background: tokens.color.scene.background,
          fontFamily: tokens.text.stage.appBody.fontFamily,
          color: tokens.color.scene.foreground,
          opacity: app,
        }}
      >
        <AppFrame
          w={W}
          title="Acme Studio"
          heading="New report"
          sub="Ask for anything"
        />

        <PromptField frame={frame} focus={focus} text={text} typing={typing} />
        <ResultsPanel frame={frame} totalShown={totalShown} />
        <SidePanel
          frame={frame}
          shown={shown}
          refilter={refilter}
          chipOn={chipOn}
        />
        <PublishButton frame={frame} />

        <DemoCursor frame={frame} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
