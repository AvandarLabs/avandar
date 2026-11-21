import { Img } from "remotion";
import { positioned } from "../../positioned";
import { MarkColumnCover } from "./MarkColumnCover";
import type { Rect } from "../../layout/SceneGeometry";
import type { BrandLockupSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  exit: BrandLockupSceneProps["exit"];
  src: string;
  columns: number;
  columnRise: number;
  index: number;
  rect: Rect;
};
/** One column mask of the mark, risen and covered by the flight colour. */
export function MarkColumn({
  frame,
  exit,
  src,
  columns,
  columnRise,
  index,
  rect,
}: Readonly<Props>): ReactNode {
  return (
    <div
      style={{
        ...positioned(rect),
        overflow: "hidden",
        clipPath: `inset(${((1 - columnRise) * 100).toFixed(2)}% 0 0 0)`,
      }}
    >
      <Img
        src={src}
        alt=""
        style={{
          position: "absolute",
          left: -index * rect.width,
          top: 0,
          width: rect.width * columns,
          height: rect.height,
        }}
      />
      <MarkColumnCover frame={frame} exit={exit} />
    </div>
  );
}
