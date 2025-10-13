import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./AvaDexieVersions";

/**
 * The current Dexie DB version.
 */
export const CurrentDexieDBVersion = AvaDexieVersionManager.getVersion(
  CURRENT_AVA_DEXIE_VERSION,
);
