import { makeBucketRecord, objectKeys, prop } from "@avandar/utils";
import { match } from "ts-pattern";
import {
  AttributeMapping,
  AttributeMappingRegistry,
  AttributeMappingType,
} from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import { DatasetColumnMappingClient } from "@/clients/ontology/DatasetColumnMappingClient";
import { ManualEntryMappingClient } from "@/clients/ontology/ManualEntryMappingClient";

export const AttributeMappingClient = {
  bulkInsert: async (params: {
    data: Array<AttributeMapping<"Insert">>;
  }): Promise<void> => {
    // bucket the mappings by type
    const mappingsByType = makeBucketRecord(params.data, {
      keyFn: prop("type"),
    }) as {
      [K in AttributeMappingType]: Array<AttributeMappingRegistry<"Insert">[K]>;
    };

    // now send bulk requests for each mapping
    await Promise.all(
      objectKeys(mappingsByType).map((mappingType) => {
        return match(mappingType)
          .with("manual_entry", (type) => {
            return ManualEntryMappingClient.bulkInsert({
              data: mappingsByType[type],
            });
          })
          .with("dataset_column", (type) => {
            return DatasetColumnMappingClient.bulkInsert({
              data: mappingsByType[type],
            });
          })
          .exhaustive();
      }),
    );
  },
};
