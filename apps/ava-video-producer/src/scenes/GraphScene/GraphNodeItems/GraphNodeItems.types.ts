import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { GraphNode } from "../../scenes.types";

export type Props = {
  node: GraphNode;
  frame: number;
  at: number;
  motion: VideoMotion;
  color: string;
};
