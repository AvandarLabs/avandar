import { AvaPageDataMigrationV1 } from "../migrations/AvaPageDataMigrationV1/AvaPageDataMigrationV1";
import { AvaPageDataMigrator } from "../migrations/AvaPageDataMigrator";
import type { AvaPageData, AvaPageGenericData } from "../AvaPage.types";

const versionTransforms = [AvaPageDataMigrationV1];

AvaPageDataMigrator.registerMigrations(versionTransforms);

export function upgradeAvaPageData(data: AvaPageGenericData): AvaPageData {
  return AvaPageDataMigrator.upgrade(data);
}
