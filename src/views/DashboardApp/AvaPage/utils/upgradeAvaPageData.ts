import { AvaPageDataMigrationV1 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV1/AvaPageDataMigrationV1";
import { AvaPageDataMigrationV2 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV2/AvaPageDataMigrationV2";
import { AvaPageDataMigrationV3 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3";
import { AvaPageDataMigrationV4 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4";
import { AvaPageDataMigrator } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import type {
  AvaPageData,
  AvaPageGenericData,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";

const versionTransforms = [
  AvaPageDataMigrationV1,
  AvaPageDataMigrationV2,
  AvaPageDataMigrationV3,
  AvaPageDataMigrationV4,
];

AvaPageDataMigrator.registerMigrations(versionTransforms);

export function upgradeAvaPageData(data: AvaPageGenericData): AvaPageData {
  return AvaPageDataMigrator.upgrade(data);
}
