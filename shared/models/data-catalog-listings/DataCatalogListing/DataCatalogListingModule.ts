import { isPlainObject } from "@avandar/utils";
import { match } from "ts-pattern";
import type {
  OpenDataAccess,
  DataCatalogListingCompanionJoinPair,
  DataCatalogListingRead,
} from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";

/**
 * Builds the pipeline access shape, or undefined when the entry does not carry
 * all three pipeline columns. Every column is read explicitly rather than
 * spread, so adding a column to the union fails to compile here.
 */
function _pipelineAccess(
  entry: Readonly<DataCatalogListingRead>,
): OpenDataAccess | undefined {
  const { parquetFileName, pipelineName, pipelineRunId } = entry;
  if (
    parquetFileName === undefined ||
    pipelineName === undefined ||
    pipelineRunId === undefined
  ) {
    return undefined;
  }
  return {
    kind: "pipeline_parquet",
    parquetFileName,
    pipelineName,
    pipelineRunId,
  };
}

/**
 * Builds the API access shape, or undefined when the entry does not carry all
 * five API columns. `externalDatasetId` is one of them: it names the dataset
 * that contains the resource, so a resource id without it is unusable.
 */
function _apiAccess(
  entry: Readonly<DataCatalogListingRead>,
): OpenDataAccess | undefined {
  const {
    apiService,
    apiBaseUrl,
    externalDatasetId,
    apiResourceId,
    apiResourceFormat,
  } = entry;
  if (
    apiService === undefined ||
    apiBaseUrl === undefined ||
    externalDatasetId === undefined ||
    apiResourceId === undefined ||
    apiResourceFormat === undefined
  ) {
    return undefined;
  }
  return {
    kind: "api_resource",
    apiService,
    apiBaseUrl,
    externalDatasetId,
    apiResourceId,
    expectedFormat: apiResourceFormat,
  };
}

export const DataCatalogListingModule = {
  /**
   * Converts a catalog listing into the access shape its `accessKind` names, so
   * a caller switches on one discriminant instead of testing several columns
   * for undefined.
   *
   * Returns undefined when the entry satisfies neither shape. The database
   * forbids such a row, but a client holding a stale read can still present
   * one, and returning a partially built shape would push the same undefined
   * checks back out to every call site. The caller is expected to treat
   * undefined as an error rather than as an empty result.
   */
  toAccess(
    entry: Readonly<DataCatalogListingRead>,
  ): OpenDataAccess | undefined {
    return match(entry.accessKind)
      .with("pipeline_parquet", () => {
        return _pipelineAccess(entry);
      })
      .with("api_resource", () => {
        return _apiAccess(entry);
      })
      .exhaustive();
  },

  /**
   * The number of rows the listing's pipeline found at the source, from the
   * `row_count` it wrote into the listing's metadata. Undefined when the
   * pipeline did not record one.
   */
  getMetadataRowCount(
    entry: Readonly<Pick<DataCatalogListingRead, "metadata">>,
  ): number | undefined {
    const { metadata } = entry;
    if (!isPlainObject(metadata)) {
      return undefined;
    }
    const rowCount = metadata["row_count"];
    return typeof rowCount === "number" ? rowCount : undefined;
  },

  /**
   * The columns of a listing whose codes a `lookup` companion names. A pair
   * whose column ends in `Type` only says which list a code belongs to, so it
   * is left out, unless every pair is one.
   */
  toCompanionCodeColumns(
    joinOn: readonly DataCatalogListingCompanionJoinPair[],
  ): string[] {
    const columns = joinOn.map((pair) => {
      return pair.column;
    });
    const codeColumns = columns.filter((column) => {
      return !column.endsWith("Type");
    });
    return codeColumns.length > 0 ? codeColumns : columns;
  },
};
