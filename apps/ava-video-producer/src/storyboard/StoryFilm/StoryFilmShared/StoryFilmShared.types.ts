import { type Storyboard } from "../../schema/schema";
import { type ProductSceneRenderer } from "../ShotView";
import type { CSSProperties } from "react";
/** Inputs shared by the StoryFilm visuals. */
export type Props = {
  plan: Storyboard;
  productScene?: ProductSceneRenderer;
  showCaptions?: boolean;
};
/** Inputs shared by the StoryFilm visuals. */
export type ShotLayerProps = {
  shot: Storyboard["shots"][number];
  frame: number;
  width: number;
  height: number;
  productScene?: ProductSceneRenderer;
  style: CSSProperties;
};
