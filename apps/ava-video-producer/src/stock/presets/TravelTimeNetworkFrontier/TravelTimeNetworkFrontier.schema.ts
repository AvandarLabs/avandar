import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input without coercion or field defaults. */
const networkSchema = z.strictObject({
  nodes: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(16),
        x: z.number().min(5).max(95),
        y: z.number().min(5).max(95),
      }),
    )
    .min(3)
    .max(6),
  roads: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        fromId: z.string().max(12),
        toId: z.string().max(12),
        minutes: z.number().int().min(1).max(20),
      }),
    )
    .min(2)
    .max(7),
  originId: z.string().max(12),
  budgetMinutes: z.number().int().min(1).max(40),
  modeLabel: z.string().min(1).max(34),
  showCosts: z.boolean(),
}) satisfies z.ZodType;
function _validateNetworkReferences({
  input,
  context,
}: {
  input: z.infer<typeof networkSchema>;
  context: z.RefinementCtx;
}): void {
  const nodeIds = input.nodes.map(prop("id"));
  const roadIds = input.roads.map(prop("id"));
  const edges = input.roads.map((road) =>
    JSON.stringify([road.fromId, road.toId].sort()),
  );
  if (
    new Set(nodeIds).size !== nodeIds.length ||
    new Set(roadIds).size !== roadIds.length ||
    new Set(edges).size !== edges.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["roads"],
      message: "Node IDs, road IDs and unordered edges must be unique.",
    });
  }
  if (
    !nodeIds.includes(input.originId) ||
    input.roads.some(
      (road) =>
        road.fromId === road.toId ||
        !nodeIds.includes(road.fromId) ||
        !nodeIds.includes(road.toId),
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["roads"],
      message: "Origin and distinct road endpoints must reference nodes.",
    });
  }
}
function _validateNetworkConnectivity({
  input,
  context,
}: {
  input: z.infer<typeof networkSchema>;
  context: z.RefinementCtx;
}): void {
  const reached = new Set([input.originId]);
  input.nodes.forEach(() =>
    input.roads.forEach((road) => {
      if (reached.has(road.fromId) || reached.has(road.toId)) {
        reached.add(road.fromId);
        reached.add(road.toId);
      }
    }),
  );
  if (input.nodes.some((node) => !reached.has(node.id))) {
    context.addIssue({
      code: "custom",
      path: ["roads"],
      message: "Every node must connect to origin.",
    });
  }
}
/** Strict complete authored input without coercion or field defaults. */
export const inputSchema = networkSchema.superRefine((input, context) => {
  _validateNetworkReferences({ input, context });
  _validateNetworkConnectivity({ input, context });
}) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-network",
    paths: [
      "nodes.*.id",
      "roads.*.id",
      "roads.*.fromId",
      "roads.*.toId",
      "originId",
      "budgetMinutes",
    ],
    description:
      "Nodes and roads have unique IDs of at most 12 characters, including at most one empty ID in each set. Unordered edges are unique. Origin and distinct edge endpoints must reference nodes exactly. Every node connects to origin. Shortest costs use node input order for queue ties and road order for neighbor discovery, retaining the first equal-cost predecessor. A cost at the budget is included.",
  },
];
