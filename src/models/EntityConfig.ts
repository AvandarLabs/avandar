import camelCaseKeys from "camelcase-keys";
import { CamelCasedPropertiesDeep, IsEqual, Merge } from "type-fest";
import { z } from "zod";
import { Expect } from "@/lib/types/utilityTypes";
import { uuidType } from "@/lib/utils/validators";
import { UserId } from "@/models/User";
import type { UUID } from "@/lib/types/common";
import type { Database } from "@/types/database.types";

export type EntityConfigId = UUID<"EntityConfig">;

type DatabaseEntityConfig =
  Database["public"]["Tables"]["entity_configs"]["Row"];

export type EntityConfig = Merge<
  CamelCasedPropertiesDeep<DatabaseEntityConfig>,
  {
    id: EntityConfigId;
    ownerId: UserId;
  }
>;

/**
 * Parse a database entity config into an EntityConfig object.
 */
export const EntityConfigDatabaseParser = z
  .object({
    id: uuidType<EntityConfigId>(),
    owner_id: uuidType<UserId>(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .transform((v) => {
    return camelCaseKeys(v, { deep: true });
  });

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Ignore the fact we never reference `Tests`
type Tests = [
  Expect<
    IsEqual<z.input<typeof EntityConfigDatabaseParser>, DatabaseEntityConfig>
  >,
  Expect<IsEqual<z.output<typeof EntityConfigDatabaseParser>, EntityConfig>>,
];
