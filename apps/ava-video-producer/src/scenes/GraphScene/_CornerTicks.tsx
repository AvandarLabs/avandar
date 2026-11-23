import { GraphSceneShared } from "./GraphSceneShared";
import type { ReactNode } from "react";

type Props = { line: string };

/** Four L-shaped corner ticks framing a node without a full border. */
export function _CornerTicks({ line }: Readonly<Props>): ReactNode {
  const corners = [
    { top: 0, left: 0, borderTop: true, borderLeft: true },
    { top: 0, right: 0, borderTop: true, borderRight: true },
    { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
    { bottom: 0, right: 0, borderBottom: true, borderRight: true },
  ];
  return (
    <>
      {corners.map(
        (
          { borderTop, borderLeft, borderBottom, borderRight, ...position },
          index,
        ) => {
          return (
            <span
              key={index}
              aria-hidden="true"
              style={{
                position: "absolute",
                ...position,
                width: GraphSceneShared.TICK_ARM,
                height: GraphSceneShared.TICK_ARM,
                borderTop: borderTop ? line : undefined,
                borderLeft: borderLeft ? line : undefined,
                borderBottom: borderBottom ? line : undefined,
                borderRight: borderRight ? line : undefined,
              }}
            />
          );
        },
      )}
    </>
  );
}
