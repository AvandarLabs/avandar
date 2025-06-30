import { SetFieldType } from "type-fest";
import { EntityComment } from "@/components/EntityDesignerApp/EntityConfigMetaView/generateEntities/pipeline-runner/runPipeline";
import { UUID } from "@/lib/types/common";
import { EntityFieldConfig } from "../EntityConfig/EntityFieldConfig/types";
import { EntityConfig, EntityConfigId } from "../EntityConfig/types";
import { UserId } from "../User/types";
import { EntityFieldValueRead } from "./EntityClient";
import type { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";

export type EntityId = UUID<"Entity">;

type DBRead = {
  id: EntityId;
  name: string; // the external name of this entity (from the source dataset)
  externalId: string; // this is the id we get from the source dataset
  entityConfigId: EntityConfigId;
  status: string;
  assignedTo: UserId | "";
  createdAt: Date;
  updatedAt: Date;
};

type EntityRead = SetFieldType<DBRead, "assignedTo", UserId | undefined>;

export type EntityModel = DexieModelCRUDTypes<
  {
    modelName: "Entity";
    primaryKey: "id";
    primaryKeyType: EntityId;
    dbTypes: {
      DBRead: DBRead;
      DBUpdate: Partial<DBRead>;
    };
    modelTypes: {
      Read: EntityRead;
      Update: Partial<EntityRead>;
    };
  },
  {
    relationships: {
      entityConfig: EntityConfig;
      fieldConfigs: EntityFieldConfig[];
      fieldValues: Array<
        EntityFieldValueRead & { fieldConfig: EntityFieldConfig }
      >;
      comments: EntityComment[];
    };
  }
>;

export type Entity<K extends keyof EntityModel = "Read"> = EntityModel[K];
export type EntityWith<R extends keyof EntityModel["relationships"]> =
  EntityModel["Read"] & { [Rel in R]: EntityModel["relationships"][Rel] };
