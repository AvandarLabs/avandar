import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfig } from "@/models/EntityConfig/types";

export type EntityConfigForm = EntityConfig<"Insert"> & {
  fields: Array<EntityFieldConfig<"Draft">>;
};
