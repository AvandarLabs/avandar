/* eslint-disable @typescript-eslint/no-namespace */
import type {
  LocalPublicDatasetModel,
  LocalPublicDataset as LocalPublicDatasetRead,
} from "@/models/LocalPublicDataset/LocalPublicDataset.types";

export { LocalPublicDatasetParsers } from "@/models/LocalPublicDataset/LocalPublicDatasetParsers";

/** Cached public dataset metadata stored by the browser client. */
export namespace LocalPublicDataset {
  export type T<K extends keyof LocalPublicDatasetModel = "Read"> =
    LocalPublicDatasetModel[K];
  export type Model = LocalPublicDatasetModel;
  export type Read = LocalPublicDatasetRead;
}
