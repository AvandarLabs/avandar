import { makeParserRegistry } from "@clients";
import { identity } from "@utils";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import type {
  PlanAnnotationId,
  PlanAnnotationModel,
} from "./PlanAnnotation.types";
import type { Expect, ZodSchemaEqualsTypes } from "@utils";

const AnnotationBaseSchema = z.object({
  id: uuidType<PlanAnnotationId>(),
  planId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  text: z.string().optional(),
  color: z.string().optional(),
});

const TextAnnotationSchema = AnnotationBaseSchema.extend({
  kind: z.literal("text"),
  x: z.number(),
  y: z.number(),
  fontSize: z.number(),
  rotation: z.number().optional(),
}).strict();

const StickyAnnotationSchema = AnnotationBaseSchema.extend({
  kind: z.literal("sticky"),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}).strict();

const ArrowAnnotationSchema = AnnotationBaseSchema.extend({
  kind: z.literal("arrow"),
  fromX: z.number(),
  fromY: z.number(),
  toX: z.number(),
  toY: z.number(),
}).strict();

const StrokeAnnotationSchema = AnnotationBaseSchema.extend({
  kind: z.literal("stroke"),
  points: z.array(z.tuple([z.number(), z.number(), z.number().optional()])),
  strokeWidth: z.number(),
}).strict();

const AnnotationSchema = z.discriminatedUnion("kind", [
  TextAnnotationSchema,
  StickyAnnotationSchema,
  ArrowAnnotationSchema,
  StrokeAnnotationSchema,
]);

const AnnotationStorageKeysSchema = AnnotationBaseSchema.extend({
  kind: z.enum(["text", "sticky", "arrow", "stroke"]),
  x: z.number().optional(),
  y: z.number().optional(),
  fontSize: z.number().optional(),
  rotation: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fromX: z.number().optional(),
  fromY: z.number().optional(),
  toX: z.number().optional(),
  toY: z.number().optional(),
  points: z
    .array(z.tuple([z.number(), z.number(), z.number().optional()]))
    .optional(),
  strokeWidth: z.number().optional(),
});

const DBReadSchema = Object.assign(AnnotationSchema, {
  shape: AnnotationStorageKeysSchema.shape,
});

/** Parser registry for browser-local plan annotations. */
export const PlanAnnotationParsers =
  makeParserRegistry<PlanAnnotationModel>().build({
    modelName: "PlanAnnotation",
    DBReadSchema: DBReadSchema as unknown as z.ZodObject<{
      [K in keyof PlanAnnotationModel["DBRead"]]: z.ZodType<
        PlanAnnotationModel["DBRead"][K],
        PlanAnnotationModel["DBRead"][K]
      >;
    }>,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = PlanAnnotationModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
