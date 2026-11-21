import { Motion } from "../../../motion";
import { ArriveShared } from "./ArriveShared";
import type { ReactNode } from "react";

type Props = {
  progress: number;
  children: ReactNode;
};
/** An entrance that scales up about the children's own centre. */
export function ScaleArrive({
  progress,
  children,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={progress}
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        transform: `scale(${Motion.mix({
          t: progress,
          from: ArriveShared.SCALE_STYLE_START,
          to: 1,
        })})`,
      }}
    >
      {children}
    </g>
  );
}
