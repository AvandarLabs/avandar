import { PuckConfigMigrationV1 } from "../migrations/PuckConfigMigrationV1/PuckConfigMigrationV1";
import { PuckConfigVersionMigrator } from "../migrations/PuckConfigVersionMigrator";
import type {
  DashboardGenericData,
  DashboardPuckData,
} from "../DashboardPuck.types";

const versionTransforms = [PuckConfigMigrationV1];

PuckConfigVersionMigrator.registerMigrations(versionTransforms);

export function upgradePuckConfig(
  data: DashboardGenericData,
): DashboardPuckData {
  return PuckConfigVersionMigrator.upgrade(data);
}
