import type { Rect } from "../../../layout/SceneGeometry";
import type { BrandLockupSceneProps } from "../../../scenes.types";
/** Inputs shared by the LockupMark visuals. */
export type MarkColumnsProps = Pick<
  BrandLockupSceneProps,
  "frame" | "build" | "exit"
> &
  Readonly<{
    mark: Rect;
    width: number;
    height: number;
    src: string;
    columns: number;
  }>;
