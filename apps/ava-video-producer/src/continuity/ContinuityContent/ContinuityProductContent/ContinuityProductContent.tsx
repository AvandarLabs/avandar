import { ContinuityAnnotation } from "../../ContinuityAnnotation/ContinuityAnnotation";
import { ContinuityTimeline } from "../../ContinuityTimeline/ContinuityTimeline";
import css from "./ContinuityProductContent.module.css";
import type { ProductSceneRenderer } from "../../../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "../../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "product" }>;
  frame: number;
  accent: string;
  productScene?: ProductSceneRenderer;
};
/** Render a product segment and its annotations on the native stage. */
export function ContinuityProductContent({
  content,
  frame,
  accent,
  productScene,
}: Readonly<Props>): ReactNode {
  if (!productScene) {
    throw new Error("Product scenes require the Avandar product bridge");
  }
  return (
    <>
      <div className={css.continuityProductContent}>
        {productScene({
          ...content.segment,
          fromFrame: 0,
          frame: ContinuityTimeline.getProductFrame({
            frame,
            segment: content.segment,
          }),
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
