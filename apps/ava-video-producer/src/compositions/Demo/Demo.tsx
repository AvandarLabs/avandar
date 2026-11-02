import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AppFrame, Cursor } from "../../chrome/chrome";
import { cursorOnTarget } from "../../cursor-motion";
import { TYPE } from "../../fonts";
import { DUR, EASE, countTo, mix, ramp, typed } from "../../motion";
import { PromptField } from "./PromptField";
import { PublishButton } from "./PublishButton";
import { ResultsPanel } from "./ResultsPanel";
import { SidePanel } from "./SidePanel";
import {
  APP_IN,
  CHIP_CLICK,
  CLICKS,
  COUNT_AT,
  FIELD_CLICK,
  OUT_AT,
  POINTER,
  PROMPT,
  PUBLISH_CLICK,
  REFILTER_AT,
  ROWS_AT,
  RUN_CLICK,
  TOTAL_ALL,
  TOTAL_PAID,
  TYPE_AT,
  W,
} from "./timeline";

export { DEMO_LEN } from "./timeline";

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
 */
export function Demo() {
  const frame = useCurrentFrame();

  // The app arrives and leaves on opacity only. Never a transform on this
  // container: it holds the whole UI, and a scale on it resamples every
  // glyph inside. Opacity is safe: it composites.
  const appIn = ramp(frame, APP_IN, DUR.sheet, EASE.out);
  const appOut = 1 - ramp(frame, OUT_AT, 20, EASE.out);
  const app = Math.min(appIn, appOut);

  // Focus arrives on the click and leaves again on Run. A field that stays
  // lit for the rest of the clip, caret still blinking while the pointer is
  // across the screen pressing something else, reads as a mock-up: real
  // software answers the pointer, and the eye knows what a focus ring means.
  const focus =
    ramp(frame, FIELD_CLICK, DUR.chip) * (1 - ramp(frame, RUN_CLICK, DUR.chip));
  const text = typed(frame, TYPE_AT, PROMPT);
  const typing = text.length > 0 && text.length < PROMPT.length;

  // Two counters in sequence. The first counts up from nothing when the
  // results land; the second travels from that value to the filtered one
  // when the chip is clicked. A number that jumps between the two is the
  // loudest teleport on screen, because the eye is already reading it.
  const matched = countTo(frame, COUNT_AT, 1940);
  const refilter = ramp(frame, REFILTER_AT, DUR.sheet);
  const shown =
    frame < REFILTER_AT ? matched : Math.round(mix(refilter, 1940, 312));

  // The filter has to act on the thing it filters. A chip lighting up while
  // five channels sit there untouched, Organic search among them, under a
  // "Paid only" filter, is the clip contradicting itself, and it does it in
  // the frame the poster gets cut from. The excluded rows dim and their bars
  // retract; the total recounts to the paid subset.
  const totalShown =
    frame < REFILTER_AT
      ? TOTAL_ALL
      : Math.round(mix(refilter, TOTAL_ALL, TOTAL_PAID));
  const chipOn = ramp(frame, CHIP_CLICK, DUR.chip);

  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      <AbsoluteFill
        style={{
          background: "var(--background)",
          fontFamily: TYPE,
          color: "var(--foreground)",
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

        <Cursor
          frame={frame}
          path={POINTER}
          clicks={CLICKS}
          cursor={cursorOnTarget(frame, POINTER, [
            { frame: FIELD_CLICK, x: 420, y: 194, cursor: "text" },
            { frame: RUN_CLICK, x: 1484, y: 194, cursor: "pointer" },
            { frame: CHIP_CLICK, x: 1285, y: 465, cursor: "pointer" },
            { frame: PUBLISH_CLICK, x: 1305, y: 917, cursor: "pointer" },
          ])}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
