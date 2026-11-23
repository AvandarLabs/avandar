import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import css from "./ContinuitySceneStatus.module.css";
import type { ContinuityPlan } from "../../continuitySchema/continuitySchema";
import type { useContinuityScene } from "../useContinuityScene";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useContinuityScene>,
  "evidenceChip" | "bar" | "duration"
> & { plan: ContinuityPlan; frame: number };
/**
 * Present evidence labels and timeline progress without altering stage layout.
 */
export function ContinuitySceneStatus({
  plan,
  frame,
  evidenceChip,
  bar,
  duration,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <div className={css.continuitySceneStatusEvidence}>
        <span style={evidenceChip}>{plan.evidence}</span>
        <span style={evidenceChip}>{plan.title}</span>
      </div>
      <div
        className={css.continuitySceneStatusProgress}
        style={{
          width: `${Math.min(1, frame / (duration - 1)) * 100}%`,
          height: bar.height,
          background: VideoCssValues.makeColorFromAlpha({
            color: bar.paint.color,
            alpha: bar.paint.alpha,
          }),
        }}
      />
    </>
  );
}
