import {
  EASE,
  STAGGER,
  caretOn,
  enter,
  mixToken,
  ramp,
  typed,
} from "../../../motion";
import {
  BAR_GROW_FRAMES,
  getBarComparisonBeats,
  getBarFractions,
} from "../../../scenes/BarComparisonScene/barComparisonMotion";
import {
  getCtaBeats,
  getFlightColumnRect,
  getFlightProgress,
  getMarkBuildEndFrame,
  getMarkBuildProgress,
} from "../../../scenes/BrandLockupScene/brandLockupMotion";
import { getLineRevealStyle } from "../../../scenes/textReveal";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas, DEMO_CANVAS } from "./parts/DemoCanvas";
import type { HelperDemoProps } from "./helperDemo.types";

const BUILD = { columns: 8 };
/** An abstract block mark, never another brand's geometry. */
const MARK = { x: 200, y: 110, width: 180, height: 180 };

/** An abstract mark rising through eight column masks, left to right. */
export function MarkBuildDemo({ frame, frames }: HelperDemoProps) {
  const progress = getMarkBuildProgress(frame, BUILD);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getMarkBuildProgress(frame, { columns: 8 })"
      readouts={[
        { name: "first", value: formatReadout(progress[0]) },
        { name: "last", value: formatReadout(progress[7]) },
        { name: "end", value: `${getMarkBuildEndFrame(BUILD)}f` },
      ]}
    >
      <DemoCanvas>
        {progress.map((columnProgress, index) => (
          <span
            key={`column-${MARK.x + index * 25}`}
            className={css.markColumn}
            style={{
              left: MARK.x + (index * MARK.width) / BUILD.columns,
              top: MARK.y,
              width: MARK.width / BUILD.columns,
              height: MARK.height,
              clipPath: `inset(${((1 - columnProgress) * 100).toFixed(2)}% 0 0 0)`,
            }}
          />
        ))}
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

const FLY_THROUGH = { kind: "fly-through", atFrame: 30 } as const;

/** The mark's columns at one point of their flight, coloured by the cover. */
function FlightColumns({ flight, cover }: { flight: number; cover: number }) {
  const background = mixToken(
    cover,
    "var(--demo-brand)",
    "var(--demo-highlight)",
  );
  return Array.from({ length: BUILD.columns }, (_, index) => {
    const rect = getFlightColumnRect(
      index,
      BUILD.columns,
      MARK,
      DEMO_CANVAS,
      flight,
    );
    return (
      <span
        key={`flight-${index * 25}`}
        className={css.markColumn}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width + 0.5,
          height: rect.height,
          background,
        }}
      />
    );
  });
}

/** The mark's columns flying out to cover the frame in a token colour. */
export function FlyThroughDemo({ frame, frames }: HelperDemoProps) {
  const { retract, flight, cover } = getFlightProgress(frame, FLY_THROUGH);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='getFlightProgress(frame, { kind: "fly-through", atFrame: 30 }) → getFlightColumnRect(...)'
      readouts={[
        { name: "retract", value: formatReadout(retract) },
        { name: "flight", value: formatReadout(flight) },
        { name: "cover", value: formatReadout(cover) },
      ]}
    >
      <DemoCanvas>
        <p
          className={css.wordmark}
          style={{ clipPath: `inset(0 ${(retract * 100).toFixed(2)}% 0 0)` }}
        >
          Motion Atlas
        </p>
        <FlightColumns flight={flight} cover={cover} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

const COMMAND = "pnpm showcase";
const CTA = { atFrame: 10, command: COMMAND };
const CPS = 30;

/** Subtitle, URL, typed command and badge arriving on their computed beats. */
export function CtaBeatsDemo({ frame, frames }: HelperDemoProps) {
  const beats = getCtaBeats(CTA, CPS);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getCtaBeats({ atFrame: 10, command: "${COMMAND}" }, ${CPS})`}
      readouts={[
        { name: "urlAt", value: `${beats.urlAt}f` },
        { name: "typingAt", value: `${beats.typingAt}f` },
        { name: "typingEnd", value: `${beats.typingEnd}f` },
        { name: "badgeAt", value: `${beats.badgeAt}f` },
      ]}
    >
      <div className={css.lines}>
        <p
          className={css.kicker}
          style={getLineRevealStyle(frame, beats.subtitleAt, "line-fade")}
        >
          Every helper, previewed live.
        </p>
        <p
          className={css.headline}
          style={getLineRevealStyle(frame, beats.urlAt, "line-fade")}
        >
          localhost:4173/motion.html
        </p>
        <div
          className={css.terminal}
          style={getLineRevealStyle(frame, beats.promptAt, "line-fade")}
        >
          <span className={css.prompt}>$ </span>
          {typed(frame, beats.typingAt, COMMAND, CPS)}
          <span style={{ opacity: caretOn(frame) ? 1 : 0 }}>▍</span>
        </div>
        <span className={css.badge} style={enter(frame, beats.badgeAt)}>
          Live previews
        </span>
      </div>
    </HelperDemoFrame>
  );
}

/** Fictional demonstration rows for the bar build. */
const ROWS = [
  { id: "north", value: 42 },
  { id: "harbor", value: 30 },
  { id: "valley", value: 18 },
  { id: "ridge", value: 9 },
];

type BarRowProps = {
  frame: number;
  beats: ReturnType<typeof getBarComparisonBeats>;
  index: number;
  label: string;
  value: number;
  fraction: number;
};

/** One row of the bar panel: label, growing bar and value, on their beats. */
function BarRow({ frame, beats, index, label, value, fraction }: BarRowProps) {
  const offset = index * STAGGER;
  const growth = ramp(frame, beats.barsAt + offset, BAR_GROW_FRAMES, EASE.word);
  return (
    <div className={css.row}>
      <span
        className={css.barLabel}
        style={enter(frame, beats.labelsAt + offset)}
      >
        {label}
      </span>
      <span className={css.bar} style={{ width: growth * fraction * 520 }} />
      <span
        className={css.barValue}
        style={enter(frame, beats.valuesAt + offset)}
      >
        {value}
      </span>
    </div>
  );
}

/** A bar panel building on its computed beats: hero, labels, bars, values. */
export function BarBeatsDemo({ frame, frames }: HelperDemoProps) {
  const beats = getBarComparisonBeats(8, 0, 3);
  const fractions = getBarFractions(ROWS);
  const labels = ["North", "Harbor", "Valley", "Ridge"];
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getBarComparisonBeats(8, 0, 3)  getBarFractions(rows)"
      readouts={Object.entries(beats).map(([name, value]) => ({
        name,
        value: `${value}f`,
      }))}
    >
      <div className={css.barPanel}>
        <p className={css.headline} style={enter(frame, beats.heroAt)}>
          42
        </p>
        {ROWS.map((row, index) => (
          <BarRow
            key={row.id}
            frame={frame}
            beats={beats}
            index={index}
            label={labels[index]}
            value={row.value}
            fraction={fractions[index]}
          />
        ))}
      </div>
      <span className={css.footnote}>{"Fictional demonstration data"}</span>
    </HelperDemoFrame>
  );
}
