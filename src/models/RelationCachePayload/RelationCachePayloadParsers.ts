import type { RelationCachePayloadModel } from "@/models/RelationCachePayload/RelationCachePayload.types";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";

import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { z } from "zod";

const DBReadSchema = z.object({
  identityKey: z.string(),
  parquetBlob: z.instanceof(Blob),
});

/** Parser registry for the browser-local relation cache payload rows. */
export const RelationCachePayloadParsers =
  makeParserRegistry<RelationCachePayloadModel>().build({
    modelName: "RelationCachePayload",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = RelationCachePayloadModel;
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
