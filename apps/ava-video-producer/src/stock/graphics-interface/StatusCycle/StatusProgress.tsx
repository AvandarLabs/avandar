import { TRACK_CORNER } from "./StatusCycle.constants";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the status progress layer for StatusCycle. */
export function StatusProgress(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.showProgress ? (
        <>
          <rect
            x={212}
            y={363}
            width={536}
            height={6}
            rx={props.shapes.corner(TRACK_CORNER)}
            fill={props.color.line}
          />
          <rect
            x={212}
            y={363}
            width={Math.max(0.01, 536 * props.progress)}
            height={6}
            rx={props.shapes.corner(TRACK_CORNER)}
            fill={props.accent}
          />
        </>
      ) : null}
    </>
  );
}
