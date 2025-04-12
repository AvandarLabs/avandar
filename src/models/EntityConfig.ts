import { EntityFieldConfigId } from "./EntityFieldConfig";
import type { UUID } from "@/lib/types/common";

export type EntityConfigId = UUID<"EntityConfig">;

export type EntityConfig = {
  id: EntityConfigId;
  ownerId: UUID<"User">;
  name: string;
  description?: string;
  fields: readonly EntityFieldConfigId[];
  titleField: EntityFieldConfigId;
  idField: EntityFieldConfigId;
};
