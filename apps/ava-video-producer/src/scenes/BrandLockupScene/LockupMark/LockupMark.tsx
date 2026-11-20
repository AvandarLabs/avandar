import { Img, staticFile } from "remotion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../../videoTheme/useVideoTheme";
import { safePublicPath } from "../../layout/layout";
import { positioned } from "../../positioned";
import { BrandLockupMotion } from "../BrandLockupMotion/BrandLockupMotion";
import { MarkColumns } from "./MarkColumns";
import type { Rect } from "../../layout/layout";
import type { BrandLockupSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type LockupMarkOptions = BrandLockupSceneProps & {
  mark: Rect;
  width: number;
  height: number;
};
/** The mark: whole at rest, as column masks while building or flying. */
export function LockupMark({
  frame,
  logo,
  build,
  exit,
  mark,
  width,
  height,
}: LockupMarkOptions): ReactNode {
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps("BrandLockup", {});
  const buildMotion = { motion, columnStagger };
  const src = staticFile(safePublicPath(logo.src));
  const columns =
    build?.columns ?? BrandLockupMotion.MARK_BUILD_DEFAULTS.columns;
  const isBuilt =
    frame >= BrandLockupMotion.getMarkBuildEndFrame({ build, buildMotion });
  const isFlying =
    BrandLockupMotion.getFlightProgress({ frame, exit, motion }).flight > 0;
  if (isBuilt && !isFlying) {
    return (
      <Img
        src={src}
        alt=""
        style={{ ...positioned(mark), objectFit: "fill" }}
      />
    );
  }
  return (
    <MarkColumns
      {...{ frame, build, exit, mark, width, height, src, columns }}
    />
  );
}
