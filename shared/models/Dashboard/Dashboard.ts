/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DashboardId,
  DashboardModel,
} from "$/models/Dashboard/Dashboard.types.ts";

export { DashboardParsers } from "$/models/Dashboard/DashboardParsers.ts";

export namespace Dashboard {
  export type T<K extends keyof DashboardModel = "Read"> = DashboardModel[K];
  export type Id = DashboardId;
}
