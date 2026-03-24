import { prop } from "@utils/objects/hofs/prop/prop";
import { makeBucketRecord } from "@utils/objects/makeBucketRecord/makeBucketRecord";
import { objectKeys } from "@utils/objects/objectKeys";
import {
  EntityFieldValueExtractor,
  EntityFieldValueExtractorRegistry,
  ValueExtractorType,
} from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";
import { match } from "ts-pattern";
import { DatasetColumnValueExtractorClient } from "@/clients/entity-configs/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "./ManualEntryExtractorClient";

export const ValueExtractorClient = {
  bulkInsert: async (params: {
    data: Array<EntityFieldValueExtractor<"Insert">>;
  }): Promise<void> => {
    // bucket the extractors by type
    const extractorsByType = makeBucketRecord(params.data, {
      keyFn: prop("type"),
    }) as {
      [K in ValueExtractorType]: Array<
        EntityFieldValueExtractorRegistry<"Insert">[K]
      >;
    };

    // now send bulk requests for each extractor
    await Promise.all(
      objectKeys(extractorsByType).map((extractorType) => {
        return match(extractorType)
          .with("manual_entry", (type) => {
            return ManualEntryExtractorClient.bulkInsert({
              data: extractorsByType[type],
            });
          })
          .with("dataset_column_value", (type) => {
            return DatasetColumnValueExtractorClient.bulkInsert({
              data: extractorsByType[type],
            });
          })
          .exhaustive();
      }),
    );
  },
};
