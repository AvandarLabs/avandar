import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored inputs and identity relationships. */
export const inputSchema = z
  .strictObject({
    stops: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(24),
          kind: z.enum([
            "depot",
            "vehicle",
            "clinic",
            "collector",
            "courier",
            "laboratory",
          ]),
        }),
      )
      .min(3)
      .max(3),
    crates: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(20),
          kind: z.enum(["carrier", "specimen"]),
          checkpoints: z
            .array(
              z.strictObject({
                stopId: z.string().min(0).max(16),
                state: z.enum(["logged", "review", "missing"]),
                acknowledged: z.boolean(),
                seal: z.enum(["intact", "broken", "unknown"]),
              }),
            )
            .min(3)
            .max(3),
        }),
      )
      .min(1)
      .max(5),
    sceneLabel: z.string().min(1).max(40),
    geographyMode: z.enum(["globe-and-schematic", "schematic-only"]),
    showMonitoring: z.boolean(),
    showLedger: z.boolean(),
    copy: z.strictObject({
      schematic: z.string().min(1).max(42),
      total: z.string().min(1).max(42),
      logged: z.string().min(1).max(42),
      review: z.string().min(1).max(42),
      missing: z.string().min(1).max(42),
      arrival: z.string().min(1).max(42),
      acknowledged: z.string().min(1).max(42),
      receiptMissing: z.string().min(1).max(42),
      sealIntact: z.string().min(1).max(42),
      sealBroken: z.string().min(1).max(42),
      sealUnknown: z.string().min(1).max(42),
    }),
    showIdentityRibbon: z.boolean(),
  })
  .superRefine((input, context) => {
    if (!_unique(input.stops) || !_unique(input.crates)) {
      context.addIssue({
        code: "custom",
        message: "Stop and container IDs must each be unique.",
      });
    }
    input.crates.forEach((crate, index) => {
      if (
        crate.checkpoints.some(
          (checkpoint, stopIndex) =>
            checkpoint.stopId !== input.stops[stopIndex]?.id,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["crates", index, "checkpoints"],
          message: "Checkpoints must match every stop in order.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Accepted input, inferred without widening the schema output. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules requiring runtime validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities-and-authored-relations",
    paths: ["stops", "crates"],
    description:
      "Container IDs persist through every stop; missing acknowledgements, unknown seals and monitoring-review states remain separately visible after receipt and never become success markers implicitly. Exactly 3 ordered stops; unique IDs <= 16 characters; labels <= 24 characters; kind is one declared value. Stops illustrate supplied custody roles, not a required clinical protocol. 1..5 containers; unique IDs <= 16 characters; labels <= 20 characters; exactly one checkpoint per stop in stop order; checkpoint references must exist. Record state, acknowledgement and seal are separate supplied facts.",
  },
];
