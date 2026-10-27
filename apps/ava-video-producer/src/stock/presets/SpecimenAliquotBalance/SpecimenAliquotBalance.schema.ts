import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with bounded collections and semantic validation. */
export const inputSchema = z
  .strictObject({
    parent: z.strictObject({
      id: z.string().min(0).max(16),
      label: z.string().min(0).max(24),
      volume: z.number().finite().int().min(1).max(12),
    }),
    aliquots: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(20),
          volume: z.number().finite().int().min(1).max(12),
        }),
      )
      .min(1)
      .max(4),
    unitLabel: z.string().min(1).max(20),
    sceneLabel: z.string().min(1).max(40),
    showLineage: z.boolean(),
    showEquation: z.boolean(),
    copy: z.strictObject({
      source: z.string().min(1).max(42),
      tubes: z.string().min(1).max(42),
      remainder: z.string().min(1).max(42),
      transferred: z.string().min(1).max(42),
      parentVolume: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    const ids = [input.parent.id, ...input.aliquots.map(prop("id"))];
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Tube identities must be unique.",
        path: ["aliquots"],
      });
    }
    if (
      input.aliquots.reduce((total, aliquot) => total + aliquot.volume, 0) >
      input.parent.volume
    ) {
      context.addIssue({
        code: "custom",
        message: "Child volume exceeds source volume.",
        path: ["aliquots"],
      });
    }
  }) satisfies z.ZodType;
/** Input is inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "specimen-aliquot-balance.0",
    paths: [
      "parent",
      "aliquots",
      "unitLabel",
      "sceneLabel",
      "showLineage",
      "showEquation",
      "copy",
    ],
    description:
      "Exactly one source specimen is represented. Child-tube count is aliquots.length; total shown tube count is 1 + aliquots.length, regardless of whether the parent remainder is zero.",
  },
  {
    id: "specimen-aliquot-balance.1",
    paths: ["parent.volume", "aliquots.*.volume"],
    description:
      "sum(aliquots.volume) must be <= parent.volume. Parent remainder is derived by subtraction, so source volume equals child volume plus remainder; no loss or separate remainder input exists.",
  },
  {
    id: "specimen-aliquot-balance.2",
    paths: [
      "parent",
      "aliquots",
      "unitLabel",
      "sceneLabel",
      "showLineage",
      "showEquation",
      "copy",
    ],
    description:
      "Volume units are fictional schematic units. Tube geometry is illustrative, not a calibrated laboratory instrument or a practical aliquoting procedure.",
  },
  {
    id: "specimen-aliquot-balance.3",
    paths: [
      "parent",
      "aliquots",
      "unitLabel",
      "sceneLabel",
      "showLineage",
      "showEquation",
      "copy",
    ],
    description:
      "This shows lineage and bookkeeping only. No assay, sample suitability, diagnostic result, laboratory method, or clinical recommendation is implied.",
  },
  {
    id: "specimen-aliquot-balance.tube-identities",
    paths: ["parent.id", "aliquots.*.id"],
    description:
      "Aliquot IDs must be unique and distinct from parent.id. Empty strings remain valid IDs when unique.",
  },
];
