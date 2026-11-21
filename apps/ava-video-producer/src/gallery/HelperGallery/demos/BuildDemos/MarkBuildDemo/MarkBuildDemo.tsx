import { BrandLockupMotion } from "../../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { BuildDemosGalleryValues } from "../BuildDemosGalleryValues/BuildDemosGalleryValues";
import css from "./MarkBuildDemo.module.css";
import type { MarkBuildMotion } from "../../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** The theme's mark build: its motion and the lockup's column stagger. */
function useMarkBuildMotion(): MarkBuildMotion {
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps({
    name: "BrandLockup",
    props: {},
  });
  return { motion, columnStagger };
}

/** The API call demonstrated by this preview. */
const MARK_BUILD_LABEL =
  "BrandLockupMotion.getMarkBuildProgress({ frame, build: { columns: 8 } })";

/** Formats the sampled mark progress and its final build frame. */
function _getMarkBuildReadouts({
  progress,
  end,
}: {
  progress: readonly number[];
  end: number;
}): DemoReadout[] {
  return [
    {
      name: "first",
      value: DemoTheme.formatReadout({ value: progress[0] }),
    },
    {
      name: "last",
      value: DemoTheme.formatReadout({ value: progress[7] }),
    },
    {
      name: "end",
      value: `${DemoTheme.formatReadout({ value: end, digits: 1 })}f`,
    },
  ];
}

/** An abstract mark rising through eight column masks, left to right. */
export function MarkBuildDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const buildMotion = useMarkBuildMotion();
  const build = { build: BuildDemosGalleryValues.BUILD, buildMotion };
  const progress = BrandLockupMotion.getMarkBuildProgress({ frame, ...build });
  const end = BrandLockupMotion.getMarkBuildEndFrame(build);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={MARK_BUILD_LABEL}
      readouts={_getMarkBuildReadouts({ progress, end })}
    >
      <DemoCanvas>
        {progress.map((columnProgress, index) => {
          return (
            <span
              key={`column-${BuildDemosGalleryValues.MARK.x + index * 25}`}
              className={css.markBuildDemoMarkColumn}
              style={{
                left:
                  BuildDemosGalleryValues.MARK.x +
                  (index * BuildDemosGalleryValues.MARK.width) /
                    BuildDemosGalleryValues.BUILD.columns,
                top: BuildDemosGalleryValues.MARK.y,
                width:
                  BuildDemosGalleryValues.MARK.width /
                  BuildDemosGalleryValues.BUILD.columns,
                height: BuildDemosGalleryValues.MARK.height,
                clipPath: `inset(${((1 - columnProgress) * 100).toFixed(2)}% 0 0 0)`,
              }}
            />
          );
        })}
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
