import { loopPhase, mix, wave } from "../../../motion";
import { SketchedShape } from "../../../stock/primitives/SketchedShape";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../videoTheme/useVideoTheme";
import css from "./demos.module.css";
import { formatReadout, useDemoColors } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "./parts/DemoCard";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** Width and height of the value-over-time plots beside each loop. */
const PLOT = { width: 420, height: 160 };

type SeriesProps = {
  frame: number;
  frames: number;
  sample: (frame: number) => number;
};

/** A helper's value across the whole loop, with a playhead at `frame`. */
function LoopSeries({ frame, frames, sample }: SeriesProps) {
  const { stroke, sketch } = useVideoTokens();
  const scales = useVideoShapeScales();
  const colors = useDemoColors();
  const points = Array.from({ length: frames }, (_, index) => {
    const x = (index / (frames - 1)) * PLOT.width;
    const y = PLOT.height - sample(index) * PLOT.height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const playheadX = (frame / (frames - 1)) * PLOT.width;
  return (
    <svg
      width={PLOT.width}
      height={PLOT.height}
      className={css.loopPlot}
      aria-hidden="true"
    >
      <SketchedShape
        shape={{ kind: "path", d: `M${points.join(" L")}` }}
        profile={sketch.shape}
        fill="none"
        stroke={colors.accent}
        strokeWidth={scales.stroke(stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "line", x1: playheadX, y1: 0, x2: playheadX, y2: PLOT.height }}
        profile={sketch.shape}
        stroke={colors.highlight}
        strokeWidth={scales.stroke(stroke.default)}
      />
      <circle
        cx={playheadX}
        cy={PLOT.height - sample(frame) * PLOT.height}
        r={7}
        fill={colors.highlight}
      />
    </svg>
  );
}

const ORBITS = [0, 20, 40];
const PERIOD = 60;

/** Radius of the orbit the phase dots travel. */
const ORBIT_RADIUS = 110;

/** Dots orbiting at their own phase offsets. */
function Orbits({ frame }: { frame: number }) {
  const { stroke, sketch } = useVideoTokens();
  const scales = useVideoShapeScales();
  const colors = useDemoColors();
  return (
    <svg
      width={300}
      height={300}
      viewBox="-150 -150 300 300"
      aria-hidden="true"
    >
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: ORBIT_RADIUS }}
        profile={sketch.shape}
        fill="none"
        stroke={colors.line}
        strokeWidth={scales.stroke(stroke.default)}
      />
      {ORBITS.map((offset) => {
        const angle = loopPhase(frame, PERIOD, offset) * Math.PI * 2;
        return (
          <circle
            key={offset}
            cx={Math.cos(angle) * ORBIT_RADIUS}
            cy={Math.sin(angle) * ORBIT_RADIUS}
            r={14}
            fill={colors.brand}
          />
        );
      })}
    </svg>
  );
}

/** Three dots orbiting with offset phases, beside one phase's sawtooth. */
export function LoopPhaseDemo({ frame, frames }: HelperDemoProps): ReactNode {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`loopPhase(frame, ${PERIOD}, offset)  offsets ${ORBITS.join(", ")}`}
      readouts={ORBITS.map((offset) => {
        return {
          name: `offset ${offset}`,
          value: formatReadout(loopPhase(frame, PERIOD, offset)),
        };
      })}
    >
      <div className={css.cards}>
        <Orbits frame={frame} />
        <div className={css.centered}>
          <LoopSeries
            frame={frame}
            frames={frames}
            sample={(value) => {
              return loopPhase(value, PERIOD);
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

/** The halo's opacity at the bottom and top of its pulse, before tint strength. */
const HALO_OPACITY = { min: 0.15, max: 0.45 };

/** A halo pulsing on a smooth cosine, beside the pulse over time. */
export function WaveDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const scales = useVideoShapeScales();
  const colors = useDemoColors();
  const pulse = wave(frame, 45);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="wave(frame, 45)"
      readouts={[{ name: "wave", value: formatReadout(pulse) }]}
    >
      <div className={css.cards}>
        <svg
          width={300}
          height={300}
          viewBox="-150 -150 300 300"
          aria-hidden="true"
        >
          <circle
            r={mix(pulse, 60, 120)}
            fill={colors.brand}
            opacity={scales.wash(mix(pulse, HALO_OPACITY.min, HALO_OPACITY.max))}
          />
          <circle r={48} fill={colors.brand} />
        </svg>
        <div className={css.centered}>
          <LoopSeries
            frame={frame}
            frames={frames}
            sample={(value) => {
              return wave(value, 45);
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

/** A graphic revealed and returned to the ground on both loop boundaries. */
export function LoopEnvelopeDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const envelope = motion.loopEnvelope(frame, frames);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`loopEnvelope(frame, ${frames})  fadeFrames ${motion.loopFade.graphic}`}
      readouts={[
        { name: "envelope", value: formatReadout(envelope) },
        { name: "first", value: formatReadout(motion.loopEnvelope(0, frames)) },
        {
          name: "last",
          value: formatReadout(motion.loopEnvelope(frames - 1, frames)),
        },
      ]}
    >
      <div className={css.cards}>
        <div className={css.centered} style={{ opacity: envelope }}>
          <DemoCard title="loopEnvelope" />
        </div>
        <div className={css.centered}>
          <LoopSeries
            frame={frame}
            frames={frames}
            sample={(value) => {
              return motion.loopEnvelope(value, frames);
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
