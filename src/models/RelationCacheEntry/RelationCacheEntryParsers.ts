import type { RelationCacheEntryModel } from "@/models/RelationCacheEntry/RelationCacheEntry.types";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";

import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { z } from "zod";

const DBReadSchema = z.object({
  identityKey: z.string(),
  tableName: z.string(),
  principalKey: z.string(),
  relationKind: z.enum(["dataset", "concept"]),
  definitionToken: z.string(),
  definitionKind: z.union([z.string(), z.undefined()]),
  sourceVersion: z.union([z.string(), z.undefined()]),
  columns: z.union([z.array(z.string()).readonly(), z.literal("all")]),
  byteSize: z.number(),
  lastQueriedAt: z.number(),
  writtenAt: z.number(),
  staleAt: z.union([z.number(), z.undefined()]),
  freshnessCheckedAt: z.union([z.number(), z.undefined()]),
});

/** Parser registry for the browser-local relation cache metadata rows. */
export const RelationCacheEntryParsers =
  makeParserRegistry<RelationCacheEntryModel>().build({
    modelName: "RelationCacheEntry",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = RelationCacheEntryModel;
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
