import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getWorkPartitionFromInput } from "../getWorkPartitionFromInput";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  piece: ReturnType<typeof getWorkPartitionFromInput>[number];
  index: number;
  frame: number;
  accent: string;
  parentLabel: string;
  showEffortValues: boolean;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  piece: Options["piece"];
  parentLabel: Options["parentLabel"];
  showEffortValues: Options["showEffortValues"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  separation: number;
  x: number;
  y: number;
  labelY: number;
  color: string;
};

/**
 * Returns piece separation, position, label placement, and theme values for
 * `WorkPiece`, `WorkPieceEffort`, `WorkPieceBody`.
 */
export function useWorkPiecePresentation({
  piece,
  index,
  frame,
  accent,
  parentLabel,
  showEffortValues,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const separation = motion.ramp(frame, 86, motion.scale(38));
  const x = piece.x + piece.shiftX * separation,
    y = piece.y + piece.shiftY * separation;
  const labelY = 222 + index * 56;
  const color = index % 2 === 0 ? accent : tokens.color.accentAlt;
  return {
    piece,
    parentLabel,
    showEffortValues,
    atomic,
    tokens,
    scales,
    separation,
    x,
    y,
    labelY,
    color,
  };
}
