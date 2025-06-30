import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { uuidType } from "@/lib/utils/zodHelpers";
import { EntityConfigId } from "../EntityConfig/types";
import { UserId } from "../User/types";
import { EntityId, EntityModel } from "./types";

const DBReadSchema = z.object({
  id: uuidType<EntityId>(),
  name: z.string(),
  externalId: z.string(),
  status: z.string(),
  entityConfigId: uuidType<EntityConfigId>(),
  assignedTo: z.union([uuidType<UserId>(), z.literal("")]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const EntityParsers = makeParserRegistry<EntityModel>().build({
  modelName: "Entity",
  DBReadSchema,
  fromDBReadToModelRead: (dbObj) => {
    return {
      ...dbObj,
      assignedTo: dbObj.assignedTo === "" ? undefined : dbObj.assignedTo,
    };
  },
  fromModelInsertToDBInsert: (modelObj) => {
    return {
      ...modelObj,
      assignedTo: modelObj.assignedTo ?? "",
    };
  },
  fromModelUpdateToDBUpdate: (modelObj) => {
    return {
      ...modelObj,
      assignedTo: modelObj.assignedTo ?? "",
    };
  },
});
