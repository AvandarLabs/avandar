import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SchoolCostSatchel.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  expenses: Array<{
    id: string;
    label: string;
    object: "book" | "ticket" | "clothing" | "meal" | "fee-slip";
    amount: number;
  }>;
  total: number;
};

/**
 * Returns ordered expenses, their total, and theme values for
 * `SchoolCostSatchel`.
 */
export function useSchoolCostSatchelPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const expenses =
    input.unpackOrder === "largest-first"
      ? [...input.expenses].sort((left, right) => {
          return right.amount - left.amount;
        })
      : input.expenses;
  const total = expenses.reduce((sum, expense) => {
    return sum + expense.amount;
  }, 0);
  return { frame, input, accent, tokens, expenses, total };
}
