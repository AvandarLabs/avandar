/** Starts every dimension listing's `external_dataset_id`. */
const DIMENSION_PREFIX = "DIMENSION/";

/**
 * The API identity of a GHO dimension's value list listing:
 * `DIMENSION/<code>` as its `external_dataset_id` and
 * `DIMENSION/<code>/DimensionValues` as its `api_resource_id`, which is also
 * its path under the drive. An indicator names its dimensions' listings as
 * companions with these, and the download script tells the two kinds of
 * listing apart by them.
 */
export const GhoDimensionIds = {
  /** The listing's `external_dataset_id`, such as `DIMENSION/COUNTRY`. */
  toExternalDatasetId: (dimensionCode: string): string => {
    return `${DIMENSION_PREFIX}${dimensionCode}`;
  },

  /**
   * The listing's `api_resource_id`, such as
   * `DIMENSION/COUNTRY/DimensionValues`.
   */
  toApiResourceId: (dimensionCode: string): string => {
    return `${DIMENSION_PREFIX}${dimensionCode}/DimensionValues`;
  },

  /** Whether an `api_resource_id` names a dimension's value list. */
  isApiResourceId: (apiResourceId: string): boolean => {
    return apiResourceId.startsWith(DIMENSION_PREFIX);
  },
};
