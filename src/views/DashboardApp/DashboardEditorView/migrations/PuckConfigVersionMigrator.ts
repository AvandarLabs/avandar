import { DashboardPuckData } from "../DashboardPuck.types";
import { CURRENT_SCHEMA_VERSION } from "./constants";
import { getVersionFromConfigData } from "./getVersionFromConfigData";
import type { DashboardGenericData } from "../utils/puck.types";

type MigrationFunction = (data: DashboardGenericData) => DashboardGenericData;

type PuckConfigVersionMigration = {
  downgradedVersion: number | undefined;
  upgradedVersion: number;
  upgrade: MigrationFunction;
  downgrade: MigrationFunction;
};

type PuckConfigVersionMigrator = {
  /**
   * Registers a list of migrations.
   * @param migrations The migrations to register.
   */
  registerMigrations: (
    migrations: readonly PuckConfigVersionMigration[],
  ) => void;

  /**
   * Upgrades the PuckConfig data to the latest version.
   * If the data object is already at the latest version, it will return the
   * data object unchanged.
   * @param data The PuckConfig data to upgrade.
   */
  upgrade: (data: DashboardGenericData) => DashboardPuckData;

  /**
   * Upgrades a PuckConfig data object by a single verison.
   * If the data object is already at the latest version, it will return the
   * data object unchanged.
   * @param data The PuckConfig data to upgrade.
   */
  upgradeOnce: (data: DashboardGenericData) => DashboardGenericData;

  /**
   * Downgrades a PuckConfig data object by a single verison.
   * If the data object is already at the first version, it will return the
   * data object unchanged.
   * @param data The PuckConfig data to downgrade.
   */
  downgradeOnce: (data: DashboardGenericData) => DashboardGenericData;
};

function createPuckConfigVersionMigrator(): PuckConfigVersionMigrator {
  // map migrations by their `downgradedVersion`
  const _upgradeMap: Map<number | undefined, PuckConfigVersionMigration> =
    new Map();

  // map migrations by their `ugpradedVersion`
  const _downgradeMap: Map<number, PuckConfigVersionMigration> = new Map();

  const _upgradeOnce = (data: DashboardGenericData): DashboardGenericData => {
    const version = getVersionFromConfigData(data);
    if (version === CURRENT_SCHEMA_VERSION) {
      // return the data unchanged if it is already at the latest version
      return data;
    }
    if (!_upgradeMap.has(version)) {
      throw new Error(`No upgrade migration found for version ${version}`);
    }
    const migration: PuckConfigVersionMigration = _upgradeMap.get(version)!;
    return migration.upgrade(data);
  };

  return {
    // TODO(jpsyx): this is a mutable function. eventually this should become
    // an immutable module once we have a generic `createModule` function we
    // can reuse that handles immutability for us.
    registerMigrations: (migrations: readonly PuckConfigVersionMigration[]) => {
      migrations.forEach((migration) => {
        _upgradeMap.set(migration.downgradedVersion, migration);
        _downgradeMap.set(migration.upgradedVersion, migration);
      });
    },

    upgrade: (data: DashboardGenericData): DashboardPuckData => {
      let upgradedData = data;
      while (
        getVersionFromConfigData(upgradedData) !== CURRENT_SCHEMA_VERSION
      ) {
        upgradedData = _upgradeOnce(upgradedData);
      }
      return upgradedData as DashboardPuckData;
    },

    upgradeOnce: (data: DashboardGenericData) => {
      return _upgradeOnce(data);
    },

    downgradeOnce: (data: DashboardGenericData) => {
      const version = getVersionFromConfigData(data);
      if (version === undefined) {
        // return the data unchanged if it has no version (meaning it is the
        // first ever schema version)
        return data;
      }
      if (!_downgradeMap.has(version)) {
        throw new Error(`No downgrade migration found for version ${version}`);
      }
      const migration: PuckConfigVersionMigration = _downgradeMap.get(version)!;
      return migration.downgrade(data);
    },
  };
}

export const PuckConfigVersionMigrator = createPuckConfigVersionMigrator();
