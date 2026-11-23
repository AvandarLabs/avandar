import { ContinuityAnnotation } from "../ContinuityAnnotation/ContinuityAnnotation";
import { ContinuityDiagramLane } from "../ContinuityDiagramLane/ContinuityDiagramLane";
import { ContinuityTimeline } from "../ContinuityTimeline/ContinuityTimeline";
import css from "./ContinuityComposite.module.css";
import type { ProductSceneRenderer } from "../../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<
    ContinuityBeat["content"],
    {
      kind: "composite";
    }
  >;
  frame: number;
  accent: string;
  productScene?: ProductSceneRenderer;
};
/**
 * One full-stage native product instance beneath independently moving
 * explanations.
 */
export function ContinuityComposite({
  content,
  frame,
  accent,
  productScene,
}: Props): ReactNode {
  if (!productScene) {
    throw new Error("Composite scenes require the Avandar product bridge");
  }
  return (
    <>
      <div className={css.continuityCompositeProduct}>
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
      <ContinuityDiagramLane content={content} frame={frame} accent={accent} />
      <ContinuityAnnotation
        annotations={content.annotations}
        frame={frame}
        accent={accent}
      />
    </>
  );
}
