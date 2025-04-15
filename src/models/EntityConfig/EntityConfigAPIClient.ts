import { SupabaseClient } from "@/clients/SupabaseClient";
import {
  ModelCRUDVariants,
  ModelParserRegistry,
} from "@/lib/utils/models/parserFactory";
import {
  EntityConfig,
  EntityConfigCRUDTypes,
  EntityConfigParsers,
} from "./EntityConfig";

/*
class ModelCRUDClient<ModelVariants extends ModelCRUDVariants> {
  protected parsers: ModelParserRegistry<ModelVariants>;

  constructor(parsers: ModelParserRegistry<ModelVariants>) {
    this.parsers = parsers;
  }

  protected parseDataForInsert(
    data: ModelVariants["Insert"],
  ): ModelVariants["DBInsert"] {
    return this.parsers.fromModelToDBInsert.parse(data);
  }
}
*/

interface ModelCRUDClient<M extends ModelCRUDVariants> {
  getParsers(): ModelParserRegistry<M>;
  insert(data: M["Insert"]): Promise<void>;
}

function parseDataForInsert<M extends ModelCRUDVariants>(
  client: ModelCRUDClient<M>,
  data: M["Insert"],
): M["DBInsert"] {
  return client.getParsers().fromModelToDBInsert.parse(data);
}

class EntityConfigAPIClientImpl
  implements ModelCRUDClient<EntityConfigCRUDTypes>
{
  getParsers(): ModelParserRegistry<EntityConfigCRUDTypes> {
    return EntityConfigParsers;
  }

  /**
   * Inserts a new entity config into the database.
   * @param entityConfig - The entity config to insert
   */
  async insert(entityConfig: EntityConfig<"Insert">): Promise<void> {
    const dataToInsert = parseDataForInsert(this, entityConfig);
    await SupabaseClient.from("entity_configs")
      .insert(dataToInsert)
      .throwOnError();
  }
}

export const EntityConfigAPIClient = new EntityConfigAPIClientImpl();
