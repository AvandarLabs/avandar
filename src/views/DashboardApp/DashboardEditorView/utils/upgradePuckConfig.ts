import { DashboardPuckData } from "../DashboardPuck.types";
import { PuckConfigMigrationV1 } from "../migrations/PuckConfigMigrationV1/PuckConfigMigrationV1";
import { PuckConfigVersionMigrator } from "../migrations/PuckConfigVersionMigrator";
import { DashboardGenericData } from "./puck.types";

const versionTransforms = [PuckConfigMigrationV1] as const;

PuckConfigVersionMigrator.registerMigrations(versionTransforms);

export function upgradePuckConfig(
  data: DashboardGenericData,
): DashboardPuckData {
  return PuckConfigVersionMigrator.upgrade(data);
}
