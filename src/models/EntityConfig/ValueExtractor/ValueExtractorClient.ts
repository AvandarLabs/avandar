import { match } from "ts-pattern";
import { makeBucketRecordFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { AggregationExtractorClient } from "./AggregationExtractor/AggregationExtractorClient";
import { DatasetColumnValueExtractorClient } from "./DatasetColumnValueExtractor/DatasetColumnValueExtractorClient";
import { ManualEntryExtractorClient } from "./ManualEntryExtractor/ManualEntryExtractorClient";
import {
  EntityFieldValueExtractor,
  EntityFieldValueExtractorRegistry,
  ValueExtractorType,
} from "./types";

export const ValueExtractorClient = {
  bulkInsert: async (params: {
    data: Array<EntityFieldValueExtractor<"Insert">>;
  }): Promise<void> => {
    // bucket the extractors by type
    const extractorsByType = makeBucketRecordFromList(params.data, {
      keyFn: getProp("type"),
    }) as {
      [K in ValueExtractorType]: Array<
        EntityFieldValueExtractorRegistry<"Insert">[K]
      >;
    };

    // now send bulk requests for each extractor
    await Promise.all(
      objectKeys(extractorsByType).map((extractorType) => {
        return match(extractorType)
          .with("aggregation", (type) => {
            return AggregationExtractorClient.bulkInsert({
              data: extractorsByType[type],
            });
          })
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
