import type {
  DashboardId,
  DashboardModel,
  DashboardSnapshotTransitionKind,
  DashboardVisibility,
} from "$/models/Dashboard/Dashboard.types.ts";

/* eslint-disable @typescript-eslint/no-namespace */
import {
  DASHBOARD_SNAPSHOT_TRANSITION_KINDS,
  DASHBOARD_VISIBILITIES,
} from "$/models/Dashboard/Dashboard.constants.ts";

export { DashboardParsers } from "$/models/Dashboard/DashboardParsers.ts";

export { collectDatasetIds } from "$/models/Dashboard/collectDatasetIds/collectDatasetIds.ts";

export { countShareableDashboards } from "$/models/Dashboard/countShareableDashboards/countShareableDashboards.ts";

export namespace Dashboard {
  /** All persisted publication states. */
  export const visibilities = DASHBOARD_VISIBILITIES;
  /** All durable snapshot transition states. */
  export const snapshotTransitionKinds = DASHBOARD_SNAPSHOT_TRANSITION_KINDS;
  export type T<K extends keyof DashboardModel = "Read"> = DashboardModel[K];
  export type Id = DashboardId;
  export type Visibility = DashboardVisibility;
  export type SnapshotTransitionKind = DashboardSnapshotTransitionKind;
}
