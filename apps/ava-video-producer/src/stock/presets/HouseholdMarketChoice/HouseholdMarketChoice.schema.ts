import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and semantic constraints. */
export const inputSchema = z
  .strictObject({
    products: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(24),
          symbol: z.enum(["grain", "beans", "vegetables", "soap"]),
          price: z.number().finite().int().min(1).max(9),
          chosen: z.boolean(),
        }),
      )
      .min(2)
      .max(5),
    availableCredits: z.number().finite().int().min(1).max(30),
    tender: z.enum(["cash", "voucher"]),
    labels: z.strictObject({
      shopper: z.string().min(0).max(24),
      retailer: z.string().min(0).max(24),
      unit: z.string().min(0).max(24),
      total: z.string().min(0).max(24),
      remaining: z.string().min(0).max(24),
      tender: z.string().min(0).max(24),
    }),
    showRemainingBalance: z.boolean(),
    scenarioCaption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (
      new Set(input.products.map(prop("id"))).size !== input.products.length
    ) {
      issue("products", "Product IDs must be unique.");
    }
    const selected = input.products.filter(prop("chosen"));
    if (
      selected.length < 1 ||
      selected.length > 3 ||
      selected.reduce((sum, item) => sum + item.price, 0) >
        input.availableCredits
    ) {
      issue(
        "products",
        "Choose 1..3 products with total price at most availableCredits.",
      );
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints and conserved quantities. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "household-market-choice.0",
    paths: ["products.*.id"],
    description: "Product IDs must be unique, including at most one empty ID.",
  },
  {
    id: "household-market-choice.1",
    paths: ["products.*.chosen", "products.*.price", "availableCredits"],
    description:
      "Exactly 1..3 products are chosen. Their integer price sum must be <= availableCredits. Each product appears exactly once; only chosen products enter the basket. Retained balance is availableCredits minus that sum, including zero.",
  },
  {
    id: "household-market-choice.2",
    paths: ["tender", "labels.tender", "labels.unit", "scenarioCaption"],
    description:
      "Author-supplied tender label must describe the selected cash or voucher mode. Unit and caption must identify fictional demo credits and prices, without real currency or invented program restrictions.",
  },
];
