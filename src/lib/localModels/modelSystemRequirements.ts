/**
 * RAM tiers we surface for on-device model pickers. Upper bound is 32 GB per
 * product guidance for offline chat + voice coexistence with DuckDB.
 */
export type ModelRamTierGb = 4 | 8 | 12 | 16 | 24 | 32;

/** User-facing RAM guidance attached to local voice and chat model entries. */
export type ModelSystemRequirements = {
  /** Minimum system RAM (GB) we recommend for this model. */
  minRamGb: ModelRamTierGb;
  /** Short label for lists, e.g. "8 GB RAM". */
  systemRequirements: string;
  /** When to pick this model over others on the same platform. */
  recommendedIf: string;
};

/** Builds the standard `N GB RAM` label for pickers. */
export function buildRamRequirementLabel(minRamGb: ModelRamTierGb): string {
  return `${minRamGb} GB RAM`;
}
