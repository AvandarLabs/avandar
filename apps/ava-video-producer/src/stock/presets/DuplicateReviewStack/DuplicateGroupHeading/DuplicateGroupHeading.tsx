import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DuplicateDecisionLabels } from "../DuplicateDecisionLabels";
import { CandidateGroupBracket } from "./CandidateGroupBracket";
import { DuplicateGroupHeadingComparisonRuler } from "./DuplicateGroupHeadingComparisonRuler";
import type { Input } from "../DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
  accent: string;
};

/** Comparison rulers and headings track the actual candidate group frame. */
export function DuplicateGroupHeading({
  frame,
  input,
  group,
  x,
  y,
  isPair,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      <CandidateGroupBracket
        group={group}
        x={x}
        y={y}
        isPair={isPair}
        progress={progress}
        tokens={tokens}
      />
      <DuplicateDecisionLabels
        frame={frame}
        labels={input.labels}
        isResolved={group.retainedId !== null}
        x={x}
        y={y}
        isPair={isPair}
        progress={progress}
      />
      <DuplicateGroupHeadingComparisonRuler
        frame={frame}
        group={group}
        x={x}
        y={y}
        isPair={isPair}
        progress={progress}
        accent={accent}
        tokens={tokens}
        motion={motion}
      />
    </g>
  );
}
