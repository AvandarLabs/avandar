import css from "./parts.module.css";
import type { ReactNode } from "react";

type Props = {
  easing: (t: number) => number;
  /** Linear time through the curve, 0 to 1. */
  t: number;
  size: number;
  /** Bezier control points to draw as handles, for a custom curve. */
  handles?: readonly [number, number, number, number];
};

/** Lowest and highest plotted value, so overshooting curves stay visible. */
const Y_RANGE = [-0.3, 1.3] as const;
const SAMPLES = 80;

/** Maps curve time and value to plot pixels. */
function _createScale(size: number) {
  return {
    toX: (value: number) => {
      return value * size;
    },
    toY: (value: number) => {
      return size - ((value - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * size;
    },
  };
}

type Scale = ReturnType<typeof _createScale>;

/** The curve's polyline points from time 0 to `limit`. */
function _buildPoints(
  easing: (t: number) => number,
  scale: Scale,
  limit: number,
): string {
  return Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const time = (index / SAMPLES) * limit;
    return `${scale.toX(time).toFixed(2)},${scale.toY(easing(time)).toFixed(2)}`;
  }).join(" ");
}

/** A Bezier's two control handles, from each endpoint to its point. */
function PlotHandles({
  handles,
  scale,
}: {
  handles: readonly [number, number, number, number];
  scale: Scale;
}) {
  const ends = [
    { id: "start", from: [0, 0], to: [handles[0], handles[1]] },
    { id: "end", from: [1, 1], to: [handles[2], handles[3]] },
  ];
  return ends.map(({ id, from, to }) => {
    return (
      <g key={id}>
        <line
          className={css.plotHandle}
          x1={scale.toX(from[0])}
          y1={scale.toY(from[1])}
          x2={scale.toX(to[0])}
          y2={scale.toY(to[1])}
        />
        <circle
          className={css.plotHandlePoint}
          cx={scale.toX(to[0])}
          cy={scale.toY(to[1])}
          r={5}
        />
      </g>
    );
  });
}

/**
 * A plotted easing curve: time on X, eased value on Y, the curve drawn in
 * full, the travelled part highlighted, and a dot at the current value.
 */
export function CurvePlot({ easing, t, size, handles }: Props): ReactNode {
  const scale = _createScale(size);
  const { toX, toY } = scale;
  return (
    <svg className={css.plot} width={size} height={size} aria-hidden="true">
      <line
        className={css.plotGuide}
        x1={0}
        x2={size}
        y1={toY(1)}
        y2={toY(1)}
      />
      <polyline
        className={css.plotAxis}
        points={`0,0 0,${toY(0)} ${size},${toY(0)}`}
      />
      <text className={css.plotText} x={-8} y={toY(1) + 4} textAnchor="end">
        1
      </text>
      <text className={css.plotText} x={-8} y={toY(0) + 4} textAnchor="end">
        0
      </text>
      {handles ? <PlotHandles handles={handles} scale={scale} /> : null}
      <polyline
        className={css.plotCurve}
        points={_buildPoints(easing, scale, 1)}
      />
      <polyline
        className={css.plotTrail}
        points={_buildPoints(easing, scale, t)}
      />
      <circle className={css.plotDot} cx={toX(t)} cy={toY(easing(t))} r={8} />
    </svg>
  );
}
