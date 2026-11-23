import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  bookId: string;
  groupIndex: number;
  frame: number;
  accent: string;
  bookX: number;
  bookY: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  groupIndex: Options["groupIndex"];
  accent: Options["accent"];
  bookX: Options["bookX"];
  bookY: Options["bookY"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  book: { id: string };
  opening: number;
  halfWidth: number;
  pageTurn: number;
};

/**
 * Returns book identity, opening width, page turn, and theme values for
 * `ReadingBookCover`, `PhysicalReadingBook`, `ReadingBookPageTurn`.
 */
export function usePhysicalReadingBookPresentation({
  bookId,
  groupIndex,
  frame,
  accent,
  bookX,
  bookY,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const book = { id: bookId };
  const opening = motion.ramp(
    frame,
    94,
    motion.scale(14),
    motion.entrance.easing,
  );
  const halfWidth = 22 + 18 * opening;
  const pageTurn = motion.ramp(
    frame,
    116,
    motion.scale(16),
    motion.entrance.easing,
  );
  return {
    groupIndex,
    accent,
    bookX,
    bookY,
    tokens,
    scales,
    book,
    opening,
    halfWidth,
    pageTurn,
  };
}
