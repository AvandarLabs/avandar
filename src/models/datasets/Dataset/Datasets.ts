import { registryKeys } from "@/lib/utils/objects/misc";
import type { Registry } from "@/lib/types/utilityTypes";
import type { DatasetSourceType } from "./Dataset.types";

const DatasetSourceTypeRegistry = {
  csv_file: true,
  google_sheets: true,
} satisfies Registry<DatasetSourceType>;

export const Datasets = {
  SourceTypes: registryKeys(DatasetSourceTypeRegistry),
};
