import { z } from "zod";
import { continuitySchema } from "../../continuity/continuitySchema";
import {
  stockRequestEnvelopeSchema,
  stockRequestSchema,
} from "../../stock/contracts/stockRequestSchema/stockRequestSchema";
import {
  assetPathSchema,
  detail,
  frame,
  id,
  label,
  positiveFrames,
  text,
  unit,
} from "./primitives";

const heading = {
  title: text.max(100).optional(),
  kicker: text.max(160).optional(),
};
const edgeSchema = z
  .object({ id, from: id, to: id, label: label.optional() })
  .strict();
const graph = z
  .object({
    ...heading,
    nodes: z
      .array(
        z
          .object({ id, label, detail: detail.optional(), x: unit, y: unit })
          .strict(),
      )
      .min(1)
      .max(12),
    edges: z.array(edgeSchema).max(40),
    traversal: z
      .array(z.object({ nodeId: id, atFrame: frame }).strict())
      .optional(),
    revealAtFrame: frame.optional(),
  })
  .strict();
const flowchart = z
  .object({
    ...heading,
    steps: z
      .array(z.object({ id, label, detail: detail.optional() }).strict())
      .min(1)
      .max(6),
    connectors: z
      .array(z.object({ from: id, to: id, label: label.optional() }).strict())
      .max(12),
    activeStep: id.optional(),
    stepAtFrames: z.array(frame).optional(),
    revealAtFrame: frame.optional(),
  })
  .strict();
const metric = z
  .object({
    ...heading,
    label,
    value: z.number().finite(),
    from: z.number().finite().optional(),
    unit: z.string().max(24).optional(),
    precision: z.number().int().min(0).max(6).optional(),
    detail: detail.optional(),
    countAtFrame: frame.optional(),
    countDurationInFrames: positiveFrames.optional(),
  })
  .strict();
const typography = z
  .object({
    ...heading,
    lines: z.array(text.max(120)).min(1).max(6),
    emphasis: z.array(text.max(60)).max(12).optional(),
    align: z.enum(["left", "center"]).optional(),
    fontSize: z.number().min(40).max(160).optional(),
    revealAtFrame: frame.optional(),
    wordStaggerFrames: z.number().int().min(2).max(12).optional(),
  })
  .strict();
const region = {
  x: unit,
  y: unit,
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
};
const media = z
  .object({
    ...heading,
    kind: z.enum(["image", "video"]),
    src: assetPathSchema,
    trimBefore: frame.optional(),
    fit: z.enum(["contain", "cover"]).optional(),
    objectPosition: z.object({ x: unit, y: unit }).strict().optional(),
    crop: z.object(region).strict().optional(),
    callouts: z
      .array(
        z
          .object({
            id,
            label,
            ...region,
            startFrame: frame,
            endFrame: positiveFrames,
          })
          .strict(),
      )
      .max(8)
      .optional(),
  })
  .strict();
const shotBase = {
  id,
  durationInFrames: positiveFrames.max(2700),
  transitionInFrames: frame.max(60).default(18),
  note: text.optional(),
};

/** The scene discriminator is also the renderer's exhaustive registry. */
export const shotSchema = z.discriminatedUnion("scene", [
  z
    .object({
      ...shotBase,
      scene: z.literal("continuity"),
      // A continuity shot can contain twelve independently timed beats.
      durationInFrames: positiveFrames.max(12 * 1800),
      props: continuitySchema,
    })
    .strict(),
  z
    .object({
      ...shotBase,
      scene: z.literal("avandar"),
      props: z
        .object({
          feature: z.enum(["import", "explorer", "dashboards", "cases", "map"]),
          fromFrame: frame.max(799).default(0),
          mode: z.enum(["full", "filter", "query", "chart"]).default("full"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...shotBase,
      scene: z.literal("title"),
      props: z.object({ name: text.max(48), kicker: text.max(100) }).strict(),
    })
    .strict(),
  z.object({ ...shotBase, scene: z.literal("graph"), props: graph }).strict(),
  z
    .object({ ...shotBase, scene: z.literal("flowchart"), props: flowchart })
    .strict(),
  z.object({ ...shotBase, scene: z.literal("metric"), props: metric }).strict(),
  z
    .object({ ...shotBase, scene: z.literal("typography"), props: typography })
    .strict(),
  z.object({ ...shotBase, scene: z.literal("media"), props: media }).strict(),
  z
    .object({
      ...shotBase,
      scene: z.literal("stock"),
      props: stockRequestEnvelopeSchema
        .extend(heading)
        .transform((props, context) => {
          const { title, kicker, ...request } = props;
          const result = stockRequestSchema.safeParse(request);
          if (!result.success) {
            result.error.issues.forEach((issue) =>
              context.addIssue({ ...issue }),
            );
            return z.NEVER;
          }
          return {
            ...result.data,
            ...(title === undefined ? {} : { title }),
            ...(kicker === undefined ? {} : { kicker }),
          };
        }),
    })
    .strict(),
]);
