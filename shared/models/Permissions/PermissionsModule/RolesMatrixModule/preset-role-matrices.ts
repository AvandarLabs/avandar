import { registry } from "@avandar/utils";
import type {
  AppType,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";

/** Apps shown in the workspace permissions matrix (order = UI rows). */
export const RESTRICTABLE_APPS = registry<AppType>().keys(
  "data_sources",
  "data_explorer",
  "dashboards",
  "gis",
  "case_types",
  "case_records",
  "settings",
);

export const EMPTY_USER_APP_ROLES_MATRIX = {
  data_sources: undefined,
  data_explorer: undefined,
  dashboards: undefined,
  gis: undefined,
  case_types: undefined,
  case_records: undefined,
  settings: undefined,
} as const satisfies UserAppRolesMatrix;

/** Built-in role group names seeded per workspace. */
export const BUILTIN_ROLE_GROUP_NAMES = {
  globalAdmin: "Global Admin",
  globalEditor: "Global Editor",
  globalViewer: "Global Viewer",
} as const;

/** Matrix matching a built-in Global Admin role group (seven admin rows). */
export const BUILTIN_GLOBAL_ADMIN_MATRIX = {
  data_sources: "admin",
  data_explorer: "admin",
  dashboards: "admin",
  gis: "admin",
  case_types: "admin",
  case_records: "admin",
  settings: "admin",
} as const satisfies UserAppRolesMatrix;

/** Matrix matching a built-in Global Editor role group. */
export const BUILTIN_GLOBAL_EDITOR_MATRIX = {
  data_sources: "editor",
  data_explorer: "editor",
  dashboards: "editor",
  gis: "editor",
  case_types: "editor",
  case_records: "editor",
  settings: undefined,
} as const satisfies UserAppRolesMatrix;

/** Matrix matching a built-in Global Viewer role group. */
export const BUILTIN_GLOBAL_VIEWER_MATRIX = {
  data_sources: "viewer",
  data_explorer: "viewer",
  dashboards: "viewer",
  gis: "viewer",
  case_types: "viewer",
  case_records: "viewer",
  settings: undefined,
} as const satisfies UserAppRolesMatrix;
