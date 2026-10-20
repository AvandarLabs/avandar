import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and semantic constraints. */
export const inputSchema = z
  .strictObject({
    carriers: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          mode: z.enum(["boat", "truck", "cargo-bike"]),
          handoffLabel: z.string().min(0).max(24),
        }),
      )
      .min(2)
      .max(3),
    parcels: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(26),
          symbol: z.enum(["grain", "blanket", "tool"]),
        }),
      )
      .min(1)
      .max(4),
    transferMethod: z.enum(["handcart", "hoist-and-cart"]),
    receivingLabel: z.string().min(1).max(30),
    showParcelLabels: z.boolean(),
    scenarioCaption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    [input.carriers, input.parcels].forEach((items) => {
      if (
        new Set(items.map(prop<{ id: string }, "id", string>("id"))).size !==
        items.length
      ) {
        issue("carriers", "Carrier and parcel IDs must each be unique.");
      }
    });
    input.carriers.forEach((carrier, index) => {
      if (
        (index > 0 && carrier.mode === "boat") ||
        carrier.mode === input.carriers[index - 1]?.mode
      ) {
        issue(
          "carriers",
          "A boat may only appear first and adjacent modes must differ.",
        );
      }
    });
    if (
      input.transferMethod === "hoist-and-cart" &&
      input.carriers[0]?.mode !== "boat"
    ) {
      issue("transferMethod", "Hoist-and-cart requires boat first.");
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints and conserved quantities. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "aid-cargo-mode-handoff.0",
    paths: ["carriers.*.id", "parcels.*.id"],
    description:
      "IDs must be unique within each collection, including at most one empty ID in each.",
  },
  {
    id: "aid-cargo-mode-handoff.1",
    paths: ["carriers.*.mode"],
    description:
      "Adjacent carrier modes must differ. Boat may appear only at index 0.",
  },
  {
    id: "aid-cargo-mode-handoff.2",
    paths: ["transferMethod", "carriers.0.mode"],
    description:
      "hoist-and-cart requires first carrier mode boat. Other boundaries use the handcart.",
  },
  {
    id: "aid-cargo-mode-handoff.3",
    paths: ["parcels"],
    description:
      "One physical glyph per input parcel persists with its authored identity through single carrier or transfer-mechanism ownership.",
  },
];
