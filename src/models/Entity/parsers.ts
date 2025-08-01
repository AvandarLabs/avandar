import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { uuidType } from "@/lib/utils/zodHelpers";
import { EntityConfigId } from "../EntityConfig/types";
import { UserId } from "../User/types";
import { WorkspaceId } from "../Workspace/types";
import { EntityId, EntityModel } from "./types";

const DBReadSchema = z.object({
  id: uuidType<EntityId>(),
  workspaceId: uuidType<WorkspaceId>(),
  name: z.string(),
  externalId: z.string(),
  status: z.string(),
  entityConfigId: uuidType<EntityConfigId>(),
  assignedTo: z.union([uuidType<UserId>(), z.literal("")]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const EntityParsers = makeParserRegistry<EntityModel>().build({
  modelName: "Entity",
  DBReadSchema,
  fromDBReadToModelRead: (dbObj) => {
    return {
      ...dbObj,
      assignedTo: dbObj.assignedTo === "" ? undefined : dbObj.assignedTo,
      createdAt: new Date(dbObj.createdAt),
      updatedAt: new Date(dbObj.updatedAt),
    };
  },
  fromModelInsertToDBInsert: (modelObj) => {
    return {
      ...modelObj,
      assignedTo: modelObj.assignedTo ?? "",
      createdAt: modelObj.createdAt.toISOString(),
      updatedAt: modelObj.updatedAt.toISOString(),
    };
  },
  fromModelUpdateToDBUpdate: (modelObj) => {
    return {
      ...modelObj,
      assignedTo: modelObj.assignedTo ?? "",
      createdAt: modelObj.createdAt?.toISOString(),
      updatedAt: modelObj.updatedAt?.toISOString(),
    };
  },
});
