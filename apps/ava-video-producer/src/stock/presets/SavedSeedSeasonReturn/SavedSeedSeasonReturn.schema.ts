import { z } from "zod";
import { getHundredthsFromQuantity } from "./getHundredthsFromQuantity";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    crop: z.strictObject({
      label: z.string().min(1).max(24),
      symbol: z.enum(["grain", "bean"]),
      unitLabel: z.string().min(1).max(12),
      harvestQuantity: z.number().min(0).max(10000),
      reservedQuantity: z.number().min(0).max(10000),
      storageLossQuantity: z.number().min(0).max(10000),
      sownQuantity: z.number().min(0).max(10000),
    }),
    cultivator: z.strictObject({
      label: z.string().min(1).max(28),
      mode: z.enum(["household", "cooperative"]),
      choiceLabel: z.string().min(1).max(40),
    }),
    seasons: z.strictObject({
      harvestLabel: z.string().min(1).max(28),
      storageLabel: z.string().min(1).max(28),
      plantingLabel: z.string().min(1).max(28),
    }),
    balanceLabels: z.strictObject({
      currentUse: z.string().min(1).max(28),
      reserved: z.string().min(1).max(28),
      storageLoss: z.string().min(1).max(28),
      sown: z.string().min(1).max(28),
      remaining: z.string().min(1).max(28),
    }),
    evidenceLabel: z.string().min(1).max(56),
    showQuantities: z.boolean(),
  })
  .refine(
    (input) =>
      [
        input.crop.harvestQuantity,
        input.crop.reservedQuantity,
        input.crop.storageLossQuantity,
        input.crop.sownQuantity,
      ].every((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value))),
    {
      path: ["crop"],
      message: "Quantities require at most two decimal places.",
    },
  )
  .refine(
    (input) => {
      const {
        harvestQuantity,
        reservedQuantity,
        storageLossQuantity,
        sownQuantity,
      } = input.crop;
      if (
        ![
          harvestQuantity,
          reservedQuantity,
          storageLossQuantity,
          sownQuantity,
        ].every(
          (value) =>
            /^\d+(?:\.\d{1,2})?$/.test(String(value)) && value <= 10000,
        )
      ) {
        return false;
      }
      return (
        harvestQuantity > 0 &&
        reservedQuantity <= harvestQuantity &&
        storageLossQuantity <= reservedQuantity &&
        getHundredthsFromQuantity(sownQuantity) <=
          getHundredthsFromQuantity(reservedQuantity) -
            getHundredthsFromQuantity(storageLossQuantity)
      );
    },
    { path: ["crop"], message: "Harvest portions must be conserved." },
  ) satisfies z.ZodType;
/** Schema-inferred scene input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime and authoring relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "decimal-quantities",
    paths: [
      "crop.harvestQuantity",
      "crop.reservedQuantity",
      "crop.storageLossQuantity",
      "crop.sownQuantity",
    ],
    description:
      "All quantities are finite 0..10000 with at most two decimal places. Decimal representation is validated without binary multiply noise.",
  },
  {
    id: "seed-conservation",
    paths: [
      "crop.harvestQuantity",
      "crop.reservedQuantity",
      "crop.storageLossQuantity",
      "crop.sownQuantity",
    ],
    description:
      "Harvest is positive. Reserve does not exceed harvest. Loss does not exceed reserve. Sown does not exceed reserve minus loss. All comparisons and derived balances use exact integer hundredths.",
  },
  {
    id: "authored-claims",
    paths: [
      "cultivator.choiceLabel",
      "balanceLabels.currentUse",
      "evidenceLabel",
      "crop",
    ],
    description:
      "The author must keep prose consistent with quantities and factual status without a yield forecast. Prose semantics are not runtime-validated.",
  },
];
