import { Get } from "type-fest";
import { AvaPageData } from "../AvaPage.types";
import { CURRENT_SCHEMA_VERSION } from "./constants";
import { getVersionFromAvaPageData } from "./getVersionFromAvaPageData";
import type { AvaPageGenericData } from "../AvaPage.types";

type MigrationFunction<
  InputData extends AvaPageGenericData,
  OutputData extends AvaPageGenericData,
> = (data: InputData) => OutputData;

type AvaPageGenericDataWithSchemaVersion = AvaPageGenericData & {
  root: { props?: { schemaVersion: number } };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAvaPageDataVersionMigration = AvaPageDataMigration<any, any>;

export type AvaPageDataMigration<
  DownVersionData extends AvaPageGenericData,
  UpVersionData extends AvaPageGenericDataWithSchemaVersion,
> = {
  downgradedVersion: Get<DownVersionData, "root.props.schemaVersion">;
  upgradedVersion: NonNullable<Get<UpVersionData, "root.props.schemaVersion">>;
  upgrade: MigrationFunction<DownVersionData, UpVersionData>;
  downgrade: MigrationFunction<UpVersionData, DownVersionData>;
};

/**
 * A version migrator for AvaPageData objects.
 */
type IAvaPageDataMigrator = {
  /**
   * Registers a list of migrations.
   * @param migrations The migrations to register.
   */
  registerMigrations: (
    migrations: readonly AnyAvaPageDataVersionMigration[],
  ) => void;

  /**
   * Upgrades the AvaPageData data to the latest version.
   * If the data object is already at the latest version, it will return the
   * data object unchanged.
   * @param data The AvaPageData object to upgrade.
   */
  upgrade: (data: AvaPageGenericData) => AvaPageData;

  /**
   * Upgrades a AvaPageData object by a single verison.
   * If the data object is already at the latest version, it will return the
   * data object unchanged.
   * @param data The AvaPageData object to upgrade.
   */
  upgradeOnce: (data: AvaPageGenericData) => AvaPageGenericData;

  /**
   * Downgrades a AvaPageData object by a single verison.
   * If the data object is already at the first version, it will return the
   * data object unchanged.
   * @param data The AvaPageData object to downgrade.
   */
  downgradeOnce: (
    data: AvaPageGenericDataWithSchemaVersion,
  ) => AvaPageGenericData;
};

function createAvaPageDataMigrator(): IAvaPageDataMigrator {
  // map migrations by their `downgradedVersion`
  const _upgradeMap: Map<number | undefined, AnyAvaPageDataVersionMigration> =
    new Map();

  // map migrations by their `ugpradedVersion`
  const _downgradeMap: Map<number, AnyAvaPageDataVersionMigration> = new Map();

  const _upgradeOnce = (data: AvaPageGenericData): AvaPageGenericData => {
    const version = getVersionFromAvaPageData(data);
    if (version === CURRENT_SCHEMA_VERSION) {
      // return the data unchanged if it is already at the latest version
      return data;
    }
    if (!_upgradeMap.has(version)) {
      throw new Error(`No upgrade migration found for version ${version}`);
    }
    const migration: AnyAvaPageDataVersionMigration = _upgradeMap.get(version)!;
    return migration.upgrade(data);
  };

  return {
    // TODO(jpsyx): this is a mutable function. eventually this should become
    // an immutable module once we have a generic `createModule` function we
    // can reuse that handles immutability for us.
    registerMigrations: (
      migrations: readonly AnyAvaPageDataVersionMigration[],
    ) => {
      migrations.forEach((migration) => {
        _upgradeMap.set(migration.downgradedVersion, migration);
        _downgradeMap.set(migration.upgradedVersion, migration);
      });
    },

    upgrade: (data: AvaPageGenericData): AvaPageData => {
      let upgradedData = data;
      while (
        getVersionFromAvaPageData(upgradedData) !== CURRENT_SCHEMA_VERSION
      ) {
        upgradedData = _upgradeOnce(upgradedData);
      }
      return upgradedData as AvaPageData;
    },

    upgradeOnce: (data: AvaPageGenericData) => {
      return _upgradeOnce(data);
    },

    downgradeOnce: (data: AvaPageGenericDataWithSchemaVersion) => {
      const version = getVersionFromAvaPageData(data);
      if (version === undefined) {
        // return the data unchanged if it has no version (meaning it is the
        // first ever schema version)
        return data;
      }
      if (!_downgradeMap.has(version)) {
        throw new Error(`No downgrade migration found for version ${version}`);
      }
      const migration = _downgradeMap.get(version)!;
      return migration.downgrade(data);
    },
  };
}

export const AvaPageDataMigrator = createAvaPageDataMigrator();
