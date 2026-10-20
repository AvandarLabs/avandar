import { getWdiCatalogDatasetPresentation } from "@pipelines/world-bank__wdi/wdiCatalogDatasetConfig";
import type {
  PipelineParquetRelation,
  TransformedColumnDescription,
} from "@avandar/etl";
import type { WdiYearCoverage } from "@pipelines/world-bank__wdi/getWdiYearCoverageFromCsv/getWdiYearCoverageFromCsv";

const WDI_SOURCE_URL =
  "https://data.worldbank.org/data-catalog/world-development-indicators";

/**
 * Builds the Parquet relation one WDI CSV becomes, with the World Bank's
 * descriptive fields and, when the table has a `Year` column, its coverage.
 * The engine adds the object's public URL to `canonicalUrls`.
 */
export function makeWdiParquetRelation(args: {
  tableBaseName: string;
  csvPath: string;
  csvColumns: readonly TransformedColumnDescription[];
  yearCoverage: WdiYearCoverage | undefined;
}): PipelineParquetRelation {
  const { yearCoverage } = args;
  const presentation = getWdiCatalogDatasetPresentation({
    tableBaseName: args.tableBaseName,
  });
  return {
    kind: "pipeline_parquet",
    tableBaseName: args.tableBaseName,
    csvPath: args.csvPath,
    csvColumns: args.csvColumns,
    externalDatasetId: args.tableBaseName,
    displayName: presentation.display_name,
    description: presentation.description,
    externalOrganizationName: "World Bank",
    externalServiceName: "World Development Indicators API",
    sourceUrl: WDI_SOURCE_URL,
    canonicalUrls: [
      WDI_SOURCE_URL,
      "https://api.worldbank.org/v2/",
      "https://datacatalog.worldbank.org/search/dataset/0037712",
    ],
    license: "CC BY 4.0",
    updateFrequency: "Annual",
    sourceUpdatedAt: undefined,
    coverageStartDate:
      yearCoverage === undefined
        ? undefined
        : new Date(Date.UTC(yearCoverage.minYear, 0, 1)),
    coverageEndDate:
      yearCoverage === undefined
        ? undefined
        : new Date(Date.UTC(yearCoverage.maxYear, 11, 31, 23, 59, 59, 999)),
    metadata:
      yearCoverage === undefined
        ? undefined
        : {
            year_coverage: {
              min_year: yearCoverage.minYear,
              max_year: yearCoverage.maxYear,
            },
          },
  };
}
