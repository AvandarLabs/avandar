import { mix } from "../../../motion";
import { ArriveShared } from "./ArriveShared/ArriveShared";
import type { ReactNode } from "react";
/** An entrance that scales up about the children's own centre. */
export function ScaleArrive({
  progress,
  children,
}: {
  progress: number;
  children: ReactNode;
}): ReactNode {
  return (
    <g
      opacity={progress}
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        transform: `scale(${mix(progress, ArriveShared.SCALE_STYLE_START, 1)})`,
      }}
    >
      {children}
    </g>
  );
}
