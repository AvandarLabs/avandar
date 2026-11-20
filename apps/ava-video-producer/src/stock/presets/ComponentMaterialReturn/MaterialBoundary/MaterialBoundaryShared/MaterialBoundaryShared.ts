/** The assembled shell's own corners: a rounded appliance, a squared module. */
const APPLIANCE_CORNER = 12;
const MODULE_CORNER = 2;
/** Distinguishes assembled appliance and module shells by corner radius. */
export const MaterialBoundaryShared = {
  /**
   * The assembled shell's own corners: a rounded appliance, a squared module.
   */
  APPLIANCE_CORNER,
  /** Assembled module corner radius before theme corner scaling. */
  MODULE_CORNER,
} as const;
