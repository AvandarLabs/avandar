import { ContinuityCameraGraphic } from "./camera/ContinuityCameraGraphic";
import { ContinuityAnnotation } from "./ContinuityAnnotation";
import { ContinuityComposite } from "./ContinuityComposite";
import css from "./ContinuityScene.module.css";
import { ContinuityThesis } from "./ContinuityThesis";
import { getProductFrame } from "./continuityTimeline";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "./continuitySchema";

type Props = {
  content: ContinuityBeat["content"];
  frame: number;
  accent: string;
  productScene?: ProductSceneRenderer;
};

/** Exhaustive content renderer with an explicit product-bridge requirement. */
export function ContinuityContent({
  content,
  frame,
  accent,
  productScene,
}: Props) {
  switch (content.kind) {
    case "stock":
      return (
        <div className={css.continuityGraphic}>
          <ContinuityCameraGraphic content={content} />
        </div>
      );
    case "thesis":
      return (
        <ContinuityThesis content={content} frame={frame} accent={accent} />
      );
    case "composite":
      return (
        <ContinuityComposite
          content={content}
          frame={frame}
          accent={accent}
          productScene={productScene}
        />
      );
    case "product": {
      if (!productScene)
        throw new Error("Product scenes require the Avandar product bridge");
      return (
        <>
          <div className={css.continuityProduct}>
            {productScene({
              ...content.segment,
              fromFrame: 0,
              frame: getProductFrame(frame, content.segment),
              width: 1600,
              height: 840,
            })}
          </div>
          <ContinuityAnnotation
            annotations={content.annotations}
            frame={frame}
            accent={accent}
          />
        </>
      );
    }
  }
}
