import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchoolCostSatchel.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  expense: Input["expenses"][number];
  targetX: number;
  total: number;
  accent: string;
  showShares: boolean;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  expense: Options["expense"];
  targetX: Options["targetX"];
  total: Options["total"];
  accent: Options["accent"];
  showShares: Options["showShares"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/**
 * Returns expense amount and share data with target placement and theme values
 * for `ExpenseAmounts`.
 */
export function useExpenseAmountsPresentation({
  expense,
  targetX,
  total,
  accent,
  showShares,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return { expense, targetX, total, accent, showShares, tokens };
}
