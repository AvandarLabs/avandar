import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { excludeUndefinedDeep } from "@/lib/utils/objects/transformations";
import { mimeType, uuidType } from "@/lib/utils/zodHelpers";
import { LocalDatasetFieldSchema } from "./LocalDatasetField/parsers";
import { LocalDataset, LocalDatasetId, LocalDatasetModel } from "./types";

/**
 * Zod schema for the local dataset type.
 */
export const DBReadSchema = z.object({
  id: uuidType<LocalDatasetId>(),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
  sizeInBytes: z.number(),
  mimeType,
  delimiter: z.string(),
  firstRowIsHeader: z.boolean(),
  fields: z.array(LocalDatasetFieldSchema).readonly(),
  data: z.string(),
});

export const ParsedLocalDatasetSchema = DBReadSchema.extend({
  createdAt: z.coerce.string().transform((s) => {
    return new Date(s);
  }),
  updatedAt: z.coerce.string().transform((s) => {
    return new Date(s);
  }),

  // we do not enforce more type checking here because datasets can be really
  // big and all this parsing can affect performance.
  data: z.array(z.any()),
});

export const LocalDatasetParsers =
  makeParserRegistry<LocalDatasetModel>().build({
    modelName: "LocalDataset",
    DBReadSchema,

    fromDBReadToModelRead: (dbObj: LocalDataset<"DBRead">): LocalDataset => {
      return {
        ...dbObj,
        createdAt: new Date(dbObj.createdAt),
        updatedAt: new Date(dbObj.updatedAt),
      };
    },
    fromModelInsertToDBInsert: (modelObj): LocalDataset<"DBInsert"> => {
      return {
        ...modelObj,
        createdAt: modelObj.createdAt.toISOString(),
        updatedAt: modelObj.updatedAt.toISOString(),
      };
    },
    fromModelUpdateToDBUpdate: (modelObj): LocalDataset<"DBUpdate"> => {
      return excludeUndefinedDeep({
        ...modelObj,
        createdAt: modelObj.createdAt?.toISOString(),
        updatedAt: modelObj.updatedAt?.toISOString(),
      });
    },
  });

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CRUDTypes = LocalDatasetModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
