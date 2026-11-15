import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input with cross-field validation. */
export const inputSchema = z
  .strictObject({
    zones: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(26),
          areaM2: z.number().gt(0).max(10000),
          existingShadeM2: z.number().min(0).max(10000),
        }),
      )
      .min(1)
      .max(4),
    installations: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(28),
          zoneId: z.string().min(0).max(20),
          kind: z.enum(["awning", "tree-canopy"]),
          addedShadeM2: z.number().min(0).max(10000),
        }),
      )
      .min(1)
      .max(4),
    referenceCondition: z.string().min(1).max(42),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
      stage: z.enum(["proposal", "installed"]),
    }),
    showAreaBalance: z.boolean(),
    copy: z.strictObject({
      map: z.string().min(0).max(28),
      existing: z.string().min(0).max(28),
      added: z.string().min(0).max(28),
      shaded: z.string().min(0).max(28),
      unshaded: z.string().min(0).max(28),
      proposal: z.string().min(0).max(28),
      installed: z.string().min(0).max(28),
      unit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(48),
    }),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    Array.from(["zones", "installations"] as const).forEach((field) => {
      if (
        new Set(input[field].map(prop<{ id: string }, "id", string>("id")))
          .size !== input[field].length
      ) {
        issue(field, "IDs must be unique, including an empty ID.");
      }
    });
    input.installations.forEach((installation) => {
      if (!input.zones.some(({ id }) => id === installation.zoneId)) {
        issue(
          "installations",
          "Each installation must reference an existing zone.",
        );
      }
    });
    input.zones.forEach((zone) => {
      const added = input.installations
        .filter(({ zoneId }) => zoneId === zone.id)
        .reduce((sum, item) => sum + item.addedShadeM2, 0);
      if (zone.existingShadeM2 + added > zone.areaM2) {
        issue(
          "zones",
          "Existing and nonoverlapping added shade cannot exceed zone area.",
        );
      }
    });
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Complete runtime-only and editorial constraints for consumers. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "street-shade-installation.0",
    paths: ["zones.*.id"],
    description: "Zone IDs are unique, including at most one empty ID.",
  },
  {
    id: "street-shade-installation.1",
    paths: ["installations.*.id"],
    description: "Installation IDs are unique, including at most one empty ID.",
  },
  {
    id: "street-shade-installation.2",
    paths: ["installations.*.zoneId", "zones.*.id"],
    description:
      "Each zone reference matches a supplied zone, including an authored empty ID.",
  },
  {
    id: "street-shade-installation.3",
    paths: [
      "zones.*.existingShadeM2",
      "zones.*.areaM2",
      "installations.*.addedShadeM2",
      "installations.*.zoneId",
    ],
    description:
      "For each zone, existing shade plus the sum of all nonoverlapping added shade must be <= area. Zero additions and several additions sharing a zone are accepted. Denominator is the full sum of zone areas.",
  },
  {
    id: "street-shade-installation.4",
    paths: ["referenceCondition", "copy.unit"],
    description:
      "The author supplies one sun condition, nonoverlapping additions and square-metre units; no temperature reduction is inferred.",
  },
];
