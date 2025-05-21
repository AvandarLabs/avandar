import { SetFieldType } from "type-fest";
import { BuildableEntityConfig } from "@/components/EntityDesignerApp/EntityConfigMetaView/generateEntities/pipelineTypes";
import { EntityComment } from "@/components/EntityDesignerApp/EntityConfigMetaView/generateEntities/runPipeline";
import { UUID } from "@/lib/types/common";
import { EntityConfigId } from "../EntityConfig/types";
import { UserId } from "../User";
import type { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";

export type EntityId = UUID<"Entity">;

type DBRead = {
  id: EntityId;
  name: string; // the external name of this entity (from the source dataset)
  externalId: string; // this is the id we get from the source dataset
  entityConfigId: EntityConfigId;
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
      entityConfig: BuildableEntityConfig;
      comments: EntityComment[];
    };
  }
>;

export type Entity<K extends keyof EntityModel = "Read"> = EntityModel[K];
