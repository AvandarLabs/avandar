import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { validateGraph } from "../legacy/validateGraph";

const nodeSchema = z.strictObject({
  x: z.number().min(90).max(850),
  y: z.number().min(110).max(464),
  label: createLabelSchema({
    maxLength: 12,
    bounds: { fontSize: 18, width: 150 },
  }),
  detail: createLabelSchema({
    maxLength: 24,
    bounds: { fontSize: 12, width: 170 },
  }).optional(),
}) satisfies z.ZodType;
const edgeSchema: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null> = z.tuple([
  z.number().int().min(0).max(6),
  z.number().int().min(0).max(6),
]);

/** Strict authored content within the fixed NodeTraversal layout. */
export const nodeTraversalInputSchema = z
  .strictObject({
    nodes: z.array(nodeSchema).min(2).max(7),
    edges: z.array(edgeSchema).min(1).max(8),
    route: z.array(z.number().int().min(0).max(6)).min(2).max(7),
    showRouteLabel: z.boolean(),
  })
  .superRefine((input, context) =>
    validateGraph({ input, context }),
  ) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type NodeTraversalInput = z.output<typeof nodeTraversalInputSchema>;
