import { iso, object, string, enum as zodEnum } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import {
  coerceDatesInProps,
  convertDatesToISOInProps,
} from "@/lib/utils/objects/higherOrderFuncs";
import { uuidType } from "@/lib/utils/zodHelpers";
import { UserId, UserProfileId } from "@/models/User/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId, DatasetSourceTypes } from "../Dataset/types";
import { DatasetRawDataModel } from "./types";

const DBReadSchema = object({
  createdAt: iso.datetime({ offset: true }),
  datasetId: uuidType<DatasetId>(),
  updatedAt: iso.datetime({ offset: true }),
  ownerId: uuidType<UserId>(),
  ownerProfileId: uuidType<UserProfileId>(),
  workspaceId: uuidType<WorkspaceId>(),
  sourceType: zodEnum(DatasetSourceTypes),
  data: string(),
});

export const DatasetRawDataParsers =
  makeParserRegistry<DatasetRawDataModel>().build({
    modelName: "DatasetRawData",
    DBReadSchema,
    fromDBReadToModelRead: coerceDatesInProps("createdAt", "updatedAt"),
    fromModelInsertToDBInsert: convertDatesToISOInProps(
      "createdAt",
      "updatedAt",
    ),
    fromModelUpdateToDBUpdate: convertDatesToISOInProps(
      "createdAt",
      "updatedAt",
    ),
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = DatasetRawDataModel;
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
