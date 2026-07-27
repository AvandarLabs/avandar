import { makeParserRegistry } from "@clients";
import { identity } from "@utils";
import { brandedStringType } from "$/lib/zodHelpers";
import { z } from "zod";
import type { PlanStepBlobId, PlanStepBlobModel } from "./PlanStepBlob.types";
import type { Expect, ZodSchemaEqualsTypes } from "@utils";

const DBReadSchema = z.strictObject({
  id: brandedStringType<PlanStepBlobId>(),
  planId: z.string(),
  stepId: z.string(),
  parquet: z.instanceof(Blob),
  schema: z.array(
    z.strictObject({
      name: z.string(),
      type: z.string(),
    }),
  ),
  rowCount: z.number(),
  savedAt: z.number(),
});

/** Parser registry for browser-local plan step Blobs. */
export const PlanStepBlobParsers =
  makeParserRegistry<PlanStepBlobModel>().build({
    modelName: "PlanStepBlob",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = PlanStepBlobModel;
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
