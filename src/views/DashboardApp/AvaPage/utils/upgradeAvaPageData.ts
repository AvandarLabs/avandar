import { AvaPageDataMigrationV1 } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV1/AvaPageDataMigrationV1";
import { AvaPageDataMigrator } from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrator";
import type { AvaPageData, AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

const versionTransforms = [AvaPageDataMigrationV1];

AvaPageDataMigrator.registerMigrations(versionTransforms);

export function upgradeAvaPageData(data: AvaPageGenericData): AvaPageData {
  return AvaPageDataMigrator.upgrade(data);
}
