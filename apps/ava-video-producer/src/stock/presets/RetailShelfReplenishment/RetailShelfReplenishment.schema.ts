import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and cross-field validation. */
export const inputSchema = z
  .strictObject({
    goods: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(24),
          symbol: z.enum(["grain", "beans", "vegetables"]),
          openingUnits: z.number().finite().int().min(0).max(4),
          incomingUnits: z.number().finite().int().min(0).max(4),
          selectedUnits: z.number().finite().int().min(0).max(4),
        }),
      )
      .min(1)
      .max(3),
    labels: z.strictObject({
      retailer: z.string().min(0).max(26),
      shopper: z.string().min(0).max(26),
      order: z.string().min(0).max(26),
      delivery: z.string().min(0).max(26),
      unit: z.string().min(0).max(26),
    }),
    deliveryMode: z.enum(["handcart", "cargo-bike"]),
    showQuantityLabels: z.boolean(),
    showOrderSlip: z.boolean(),
    scenarioCaption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    const goods = input.goods;
    if (new Set(goods.map(prop("id"))).size !== goods.length) {
      issue("goods", "Good IDs must be unique.");
    }
    goods.forEach((good, index) => {
      if (
        good.openingUnits + good.incomingUnits > 5 ||
        good.selectedUnits > good.openingUnits + good.incomingUnits
      ) {
        issue("goods", `Good ${index} exceeds available or five shelf slots.`);
      }
    });
    const available = goods.reduce(
      (sum, good) => sum + good.openingUnits + good.incomingUnits,
      0,
    );
    const incoming = goods.reduce((sum, good) => sum + good.incomingUnits, 0);
    const selected = goods.reduce((sum, good) => sum + good.selectedUnits, 0);
    if (
      available > 12 ||
      incoming < 1 ||
      incoming > 6 ||
      selected < 1 ||
      selected > 3
    ) {
      issue(
        "goods",
        "Available <=12, incoming 1..6 and selected 1..3 are required.",
      );
    }
  }) satisfies z.ZodType;
/** Input inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "retail-shelf-replenishment.0",
    paths: ["goods.*.id"],
    description: "Good IDs are unique, including at most one empty ID.",
  },
  {
    id: "retail-shelf-replenishment.1",
    paths: [
      "goods.*.openingUnits",
      "goods.*.incomingUnits",
      "goods.*.selectedUnits",
    ],
    description:
      "Each integer quantity is 0..4. Opening plus incoming is <=5 per good and <=12 overall. Incoming totals 1..6 and selected totals 1..3. Selected is <= available for each good. Closing shelf = opening + incoming - selected, with every physical unit appearing once.",
  },
  {
    id: "retail-shelf-replenishment.2",
    paths: ["labels.unit", "scenarioCaption"],
    description:
      "Author validates explicit fictional example inventory meaning, not real measured stock.",
  },
];
