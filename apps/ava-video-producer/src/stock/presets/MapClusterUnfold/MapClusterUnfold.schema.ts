import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const baseSchema = z.strictObject({
  points: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(16),
        x: z.number().min(5).max(95),
        y: z.number().min(5).max(95),
        clusterId: z.string().max(12),
      }),
    )
    .min(3)
    .max(8),
  clusters: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(20),
        x: z.number().min(10).max(90),
        y: z.number().min(10).max(90),
      }),
    )
    .min(1)
    .max(3),
  labels: z.strictObject({
    points: z.string().max(30),
    clusters: z.string().max(30),
    total: z.string().max(30),
  }),
  showMemberIds: z.boolean(),
  copy: z.strictObject({
    context: z.string().min(1).max(40),
    before: z.string().min(1).max(40),
    after: z.string().min(1).max(40),
  }),
}) satisfies z.ZodType;
/**
 * Explicit reversible point membership permits coincident authored positions.
 */
export const inputSchema = baseSchema.superRefine((input, context) => {
  if (
    new Set(input.points.map(prop("id"))).size !== input.points.length ||
    new Set(input.clusters.map(prop("id"))).size !== input.clusters.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["points"],
      message: "Point and cluster IDs must each be unique.",
    });
  }
  if (
    input.points.some(
      (point) => !input.clusters.some(propEq("id", point.clusterId)),
    ) ||
    input.clusters.some(
      (cluster) => !input.points.some(propEq("clusterId", cluster.id)),
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["points"],
      message:
        "Every point must reference an existing cluster and every cluster must have a member.",
    });
  }
}) satisfies z.ZodType;
/** Complete strict schema output. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["points.*.id", "clusters.*.id"],
    description:
      "Point IDs and cluster IDs are each unique, including at most one empty ID in each set.",
  },
  {
    id: "complete-membership",
    paths: ["points.*.clusterId", "clusters.*.id"],
    description:
      "Each clusterId exactly references an existing cluster ID, including matching empty references. Every cluster has at least one point. Counts derive from assignment and preserve every point identity and authored coordinate. Coincident points and cluster centers are accepted.",
  },
];
