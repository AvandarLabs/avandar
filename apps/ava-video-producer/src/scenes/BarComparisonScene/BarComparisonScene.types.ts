import type { VideoMotion } from "../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";
import type { Rect } from "../layout/SceneGeometry";
import type {
  BarComparisonPanel,
  BarComparisonSceneProps,
} from "../scenes.types";
import type { BarComparisonMotion } from "./BarComparisonMotion/BarComparisonMotion";
import type { ReactNode } from "react";

export type ErasableOptions = {
  frame: number;
  startFrame?: number;
  durationInFrames: number;
  motion: VideoMotion;
  children: ReactNode;
};
export type PanelProps = BarComparisonSceneProps & {
  panel: BarComparisonPanel;
  panelIndex: number;
  rect: Rect;
  eraseStarts?: number[];
  theme: ResolvedVideoTheme;
  motion: VideoMotion;
};
export type RenderRowOptions = PanelProps & {
  row: BarComparisonPanel["rows"][number];
  rowIndex: number;
  top: number;
  pitch: number;
  fraction: number;
  beats: ReturnType<typeof BarComparisonMotion.getBarComparisonBeats>;
  erasable: (children: ReactNode, key: string) => ReactNode;
};
