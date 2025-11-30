import { registryKeys } from "@/lib/utils/objects/misc";
import type { DatasetSourceType } from "./Dataset.types";
import type { Registry } from "$/lib/types/utilityTypes";

const DatasetSourceTypeRegistry = {
  csv_file: true,
  google_sheets: true,
} satisfies Registry<DatasetSourceType>;

export const Datasets = {
  SourceTypes: registryKeys(DatasetSourceTypeRegistry),
};
