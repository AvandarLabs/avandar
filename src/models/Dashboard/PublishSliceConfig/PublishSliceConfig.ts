/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DashboardPublishConfig,
  PublishSliceConfigRead,
  PublishSliceRowFilter,
} from "./PublishSliceConfig.types";

/** Publish-time dataset selection stored with a dashboard configuration. */
export namespace PublishSliceConfig {
  /** Selection rules for one published dataset. */
  export type T = PublishSliceConfigRead;

  /** A row predicate applied when publishing a custom dataset slice. */
  export type RowFilter = PublishSliceRowFilter;

  /** Selection rules for every dataset referenced by a dashboard. */
  export type Dashboard = DashboardPublishConfig;

  /** Default dataset publication behavior for newly configured slices. */
  export const DEFAULT: T = { mode: "queried" };
}
