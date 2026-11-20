import { mixToken } from "../../../../motion";
import {
  getBarComparisonBeats,
  getBarFractions,
} from "../../../../scenes/BarComparisonScene/barComparisonMotion/barComparisonMotion";
import { BrandLockupMotion } from "../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../../../videoTheme/useVideoTheme";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas, DEMO_CANVAS } from "../parts/DemoCanvas";
import { BuildDemosShared } from "./BuildDemosShared/BuildDemosShared";
import { CtaBeatLines } from "./CtaBeatLines";
import type { MarkBuildMotion } from "../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

const BUILD = { columns: 8 };
/** The theme's mark build: its motion and the lockup's column stagger. */
function useMarkBuildMotion(): MarkBuildMotion {
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps("BrandLockup", {});
  return { motion, columnStagger };
}
/** An abstract block mark, never another brand's geometry. */
const MARK = { x: 200, y: 110, width: 180, height: 180 };
/** An abstract mark rising through eight column masks, left to right. */
export function MarkBuildDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const buildMotion = useMarkBuildMotion();
  const build = { build: BUILD, buildMotion };
  const progress = BrandLockupMotion.getMarkBuildProgress({ frame, ...build });
  const end = BrandLockupMotion.getMarkBuildEndFrame(build);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={MARK_BUILD_LABEL}
      readouts={[
        {
          name: "first",
          value: DemoTheme.formatReadout({ value: progress[0] }),
        },
        {
          name: "last",
          value: DemoTheme.formatReadout({ value: progress[7] }),
        },
        {
          name: "end",
          value: `${DemoTheme.formatReadout({ value: end, digits: 1 })}f`,
        },
      ]}
    >
      <DemoCanvas>
        {progress.map((columnProgress, index) => {
          return (
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
          );
        })}
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const FLY_THROUGH = { kind: "fly-through", atFrame: 30 } as const;
/** The mark's columns at one point of their flight, coloured by the cover. */
function FlightColumns({ flight, cover }: { flight: number; cover: number }) {
  const colors = DemoTheme.useDemoColors();
  const background = mixToken(cover, colors.brand, colors.highlight);
  return Array.from({ length: BUILD.columns }, (_, index) => {
    const rect = BrandLockupMotion.getFlightColumnRect(
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
export function FlyThroughDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const { retract, flight, cover } = BrandLockupMotion.getFlightProgress({
    frame,
    exit: FLY_THROUGH,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        'BrandLockupMotion.getFlightProgress({ frame, exit: { kind: "fly-through", atFrame: 30 } }) → BrandLockupMotion.getFlightColumnRect(...)'
      }
      readouts={[
        { name: "retract", value: DemoTheme.formatReadout({ value: retract }) },
        { name: "flight", value: DemoTheme.formatReadout({ value: flight }) },
        { name: "cover", value: DemoTheme.formatReadout({ value: cover }) },
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
const CTA = { atFrame: 10, command: BuildDemosShared.COMMAND };
/** The command's typing speed at tempo 1, in characters per second. */
const CPS = 30;
export function CtaBeatsDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const cps = CPS * motion.tempo;
  const beats = BrandLockupMotion.getCtaBeats({
    cta: CTA,
    charsPerSecond: cps,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`BrandLockupMotion.getCtaBeats({ cta: { atFrame: 10, command: "${BuildDemosShared.COMMAND}" }, charsPerSecond: ${cps} })`}
      readouts={[
        { name: "urlAt", value: `${beats.urlAt}f` },
        { name: "typingAt", value: `${beats.typingAt}f` },
        { name: "typingEnd", value: `${beats.typingEnd}f` },
        { name: "badgeAt", value: `${beats.badgeAt}f` },
      ]}
    >
      <CtaBeatLines frame={frame} beats={beats} cps={cps} />
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
  const motion = useVideoMotion();
  const offset = index * motion.stagger.list;
  const growth = motion.ramp(
    frame,
    beats.barsAt + offset,
    motion.sheet,
    motion.rise.easing,
  );
  return (
    <div className={css.row}>
      <span
        className={css.barLabel}
        style={motion.enter(frame, beats.labelsAt + offset)}
      >
        {label}
      </span>
      <span className={css.bar} style={{ width: growth * fraction * 520 }} />
      <span
        className={css.barValue}
        style={motion.enter(frame, beats.valuesAt + offset)}
      >
        {value}
      </span>
    </div>
  );
}
/** A bar panel building on its computed beats: hero, labels, bars, values. */
export function BarBeatsDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const beats = getBarComparisonBeats({
    revealAtFrame: 8,
    panelIndex: 0,
    panelStaggerFrames: 3,
    motion,
  });
  const fractions = getBarFractions(ROWS);
  const labels = ["North", "Harbor", "Valley", "Ridge"];
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={BAR_BEATS_LABEL}
      readouts={Object.entries(beats).map(([name, value]) => {
        return {
          name,
          value: `${DemoTheme.formatReadout({ value, digits: 1 })}f`,
        };
      })}
    >
      <div className={css.barPanel}>
        <p className={css.headline} style={motion.enter(frame, beats.heroAt)}>
          42
        </p>
        {ROWS.map((row, index) => {
          return (
            <BarRow
              key={row.id}
              frame={frame}
              beats={beats}
              index={index}
              label={labels[index]}
              value={row.value}
              fraction={fractions[index]}
            />
          );
        })}
      </div>
      <span className={css.footnote}>{"Fictional demonstration data"}</span>
    </HelperDemoFrame>
  );
}

/** The API call demonstrated by this preview. */
const MARK_BUILD_LABEL =
  "BrandLockupMotion.getMarkBuildProgress({ frame, build: { columns: 8 } })";

/** The API call demonstrated by this preview. */
const BAR_BEATS_LABEL =
  "getBarComparisonBeats({ revealAtFrame: 8, panelIndex: 0, panelStaggerFrames: 3 })  getBarFractions(rows)";
