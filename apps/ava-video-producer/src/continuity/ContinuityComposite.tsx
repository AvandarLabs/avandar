import { ContinuityAnnotation } from "./ContinuityAnnotation";
import { ContinuityDiagramLane } from "./ContinuityDiagramLane";
import css from "./ContinuityScene.module.css";
import { getProductFrame } from "./continuityTimeline";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "./continuitySchema";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "composite" }>;
  frame: number;
  accent: string;
  productScene?: ProductSceneRenderer;
};

/** One full-stage native product instance beneath independently moving explanations. */
export function ContinuityComposite({
  content,
  frame,
  accent,
  productScene,
}: Props) {
  if (!productScene)
    throw new Error("Composite scenes require the Avandar product bridge");
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
      <ContinuityDiagramLane content={content} frame={frame} accent={accent} />
      <ContinuityAnnotation
        annotations={content.annotations}
        frame={frame}
        accent={accent}
      />
    </>
  );
}
