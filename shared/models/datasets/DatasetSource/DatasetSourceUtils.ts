import { registry } from "@utils/objects/registry/registry.ts";
import type { DatasetSource } from "../DatasetSource/DatasetSource.ts";

export const DatasetSourceUtils = {
  SourceTypes: registry<DatasetSource.SourceType>().keys(
    "csv_file",
    "google_sheets",
    "virtual",
  ),
};
