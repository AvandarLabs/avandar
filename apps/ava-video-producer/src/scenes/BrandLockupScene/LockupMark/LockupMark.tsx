import { Img, staticFile } from "remotion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../../videoTheme/videoThemeHelpers";
import { CaptionLayout } from "../../layout/CaptionLayout";
import { positioned } from "../../positioned";
import { BrandLockupMotion } from "../BrandLockupMotion/BrandLockupMotion";
import { MarkColumns } from "./MarkColumns";
import type { Rect } from "../../layout/SceneGeometry";
import type { BrandLockupSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = BrandLockupSceneProps & {
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
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps({
    name: "BrandLockup",
    props: {},
  });
  const buildMotion = { motion, columnStagger };
  const src = staticFile(CaptionLayout.safePublicPath(logo.src));
  const columns =
    build?.columns ?? BrandLockupMotion.MARK_BUILD_DEFAULTS.columns;
  const isBuilt =
    frame >= BrandLockupMotion.getMarkBuildEndFrame({ build, buildMotion });
  const isFlying =
    BrandLockupMotion.getFlightProgress({ frame, exit, motion }).flight > 0;
  return isBuilt && !isFlying ? (
    <Img src={src} alt="" style={{ ...positioned(mark), objectFit: "fill" }} />
  ) : (
    <MarkColumns
      {...{ frame, build, exit, mark, width, height, src, columns }}
    />
  );
}
