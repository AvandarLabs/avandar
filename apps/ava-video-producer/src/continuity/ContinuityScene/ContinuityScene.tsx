import { ContinuityAppearanceContext } from "../ContinuityAppearanceContext/ContinuityAppearanceContext";
import { CONTINUITY_STAGE } from "../continuityStage";
import { ContinuityToken } from "../ContinuityToken/ContinuityToken";
import css from "./ContinuityScene.module.css";
import { ContinuitySceneStatus } from "./ContinuitySceneStatus/ContinuitySceneStatus";
import { ContinuitySequence } from "./ContinuitySequence";
import { useContinuityScene } from "./useContinuityScene";
import type { ProductSceneRenderer } from "../../storyboard/StoryFilm/ShotView";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  plan: ContinuityPlan;
  frame: number;
  productScene?: ProductSceneRenderer;
};
/**
 * Overlap-aware sequence of motions, product demonstrations and explanatory
 * composites, drawn in the surrounding video theme.
 */
export function ContinuityScene({
  plan,
  frame,
  productScene,
}: Readonly<Props>): ReactNode {
  const { evidenceChip, bar, duration, ...sequence } = useContinuityScene({
    plan,
  });

  return (
    <ContinuityAppearanceContext.Provider value={plan}>
      <div
        className={css.continuitySceneStage}
        style={{
          width: CONTINUITY_STAGE.width,
          height: CONTINUITY_STAGE.height,
        }}
      >
        <ContinuitySequence {...sequence} {...{ plan, frame, productScene }} />
        <ContinuityToken plan={plan} frame={frame} />
        <ContinuitySceneStatus
          {...{ plan, frame, evidenceChip, bar, duration }}
        />
      </div>
    </ContinuityAppearanceContext.Provider>
  );
}
