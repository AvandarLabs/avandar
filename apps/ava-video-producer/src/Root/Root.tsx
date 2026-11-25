import { StockCompositions } from "../stock/StockCompositions";
import { DemoComposition } from "./DemoComposition";
import { MotionLabComposition } from "./MotionLabComposition";
import { StoryFilmComposition } from "./StoryFilmComposition";
import "../theme.css";
import { TitleStudyComposition } from "./TitleStudyComposition";
import type { ReactNode } from "react";

/** Registers the producer compositions and their render metadata. */
export function RemotionRoot(): ReactNode {
  return (
    <>
      <StockCompositions />
      <StoryFilmComposition />
      <DemoComposition />
      <TitleStudyComposition />
      <MotionLabComposition />
    </>
  );
}

export { FPS, WIDTH, HEIGHT } from "./RootDefaults";
