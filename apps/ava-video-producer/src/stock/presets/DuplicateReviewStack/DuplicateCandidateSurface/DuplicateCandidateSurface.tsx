import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { DuplicateCandidateCardCornerValue } from "../DuplicateCandidate";
import type { Input } from "../DuplicateReviewStack.schema";
import type { getDuplicateCardLayoutFromGroupAndFrame } from "../getDuplicateCardLayoutFromGroupAndFrame";
import type { ReactNode } from "react";

type Props = {
  record: Input["groups"][number]["records"][number];
  group: Input["groups"][number];
  isRetained: ReturnType<
    typeof getDuplicateCardLayoutFromGroupAndFrame
  >["isRetained"];
  isFolded: ReturnType<
    typeof getDuplicateCardLayoutFromGroupAndFrame
  >["isFolded"];
  x: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>["x"];
  y: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>["y"];
  width: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>["width"];
  height: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>["height"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  cardCorner: DuplicateCandidateCardCornerValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
};

/** Renders the candidate id with authored geometry. */
export function DuplicateCandidateSurface({
  record,
  group,
  isRetained,
  isFolded,
  x,
  y,
  width,
  height,
  scales,
  cardCorner: CARD_CORNER,
  tokens,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-candidate-id={record.id}
      data-group-id={group.id}
      data-retained-id={isRetained && isFolded ? record.id : undefined}
      {...{ x, y, width, height }}
      rx={scales.corner(CARD_CORNER)}
      fill={tokens.color.surface}
      stroke={isRetained ? accent : tokens.color.line}
    />
  );
}
