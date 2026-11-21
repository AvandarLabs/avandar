import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DuplicateCandidateCopy } from "./DuplicateCandidateCopy";
import { DuplicateCandidateRole } from "./DuplicateCandidateRole/DuplicateCandidateRole";
import { DuplicateCandidateSurface } from "./DuplicateCandidateSurface/DuplicateCandidateSurface";
import { getDuplicateCardLayoutFromGroupAndFrame } from "./getDuplicateCardLayoutFromGroupAndFrame";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  groupIndex: number;
  record: Input["groups"][number]["records"][number];
  index: number;
  accent: string;
};

/** The type of `CARD_CORNER` used by DuplicateCandidate. */
export type DuplicateCandidateCardCornerValue = typeof CARD_CORNER;

/** A candidate card's corner before the corner style scales it. */
const CARD_CORNER = 5;

/**
 * Candidate content stays intact behind the retained face, with exposed IDs.
 */
export function DuplicateCandidate({
  frame,
  input,
  group,
  groupIndex,
  record,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const layout = getDuplicateCardLayoutFromGroupAndFrame({
    frame,
    input,
    group,
    groupIndex,
    record,
    index,
    motion,
  });
  const { x, y, width, height, isRetained, isFolded } = layout;
  return (
    <g>
      <DuplicateCandidateSurface
        {...{ record, group, isRetained, isFolded, x, y, width }}
        height={height}
        scales={scales}
        cardCorner={CARD_CORNER}
        tokens={tokens}
        accent={accent}
      />
      <DuplicateCandidateCopy {...{ input, record, layout, accent }} />
      <DuplicateCandidateRole {...{ frame, input, group, layout, accent }} />
    </g>
  );
}
