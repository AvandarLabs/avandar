import { registry } from "@avandar/utils";
import type { DatasetSourceType } from "./Dataset.types.ts";

export const Datasets = {
  SourceTypes: registry<DatasetSourceType>().keys("csv_file", "google_sheets"),
};
