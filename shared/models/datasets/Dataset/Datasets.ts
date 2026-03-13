import { registry } from "@utils/objects/registry/registry.ts";
import type { DatasetSourceType } from "./Dataset.types.ts";

export const Datasets = {
  SourceTypes: registry<DatasetSourceType>().keys("csv_file", "google_sheets"),
};
