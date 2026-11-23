import css from "./PlotHandles.module.css";
import type { Scale } from "../CurvePlotGalleryValues/CurvePlotGalleryValues";
import type { ReactNode } from "react";

type Props = {
  handles: readonly [number, number, number, number];
  scale: Scale;
};

/** A Bezier's two control handles, from each endpoint to its point. */
export function PlotHandles({ handles, scale }: Readonly<Props>): ReactNode {
  const ends = [
    { id: "start", from: [0, 0], to: [handles[0], handles[1]] },
    { id: "end", from: [1, 1], to: [handles[2], handles[3]] },
  ];
  return ends.map(({ id, from, to }) => {
    return (
      <g key={id}>
        <line
          className={css.plotHandlesPlotHandle}
          x1={scale.toX(from[0])}
          y1={scale.toY(from[1])}
          x2={scale.toX(to[0])}
          y2={scale.toY(to[1])}
        />
        <circle
          className={css.plotHandlesPlotHandlePoint}
          cx={scale.toX(to[0])}
          cy={scale.toY(to[1])}
          r={5}
        />
      </g>
    );
  });
}
