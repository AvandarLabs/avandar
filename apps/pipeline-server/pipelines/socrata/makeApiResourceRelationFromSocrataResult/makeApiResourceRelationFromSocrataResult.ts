import type {
  SocrataDiscoveryColumn,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ApiResourceRelation, RelationColumn } from "@avandar/etl";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/**
 * The asset types `SocrataClient.getRows` can read, through the `.csv`
 * export every tabular view has. Every other type (a map, file, link,
 * story, or chart) is listed but cannot be added to a workspace.
 */
const TABULAR_ASSET_TYPES: ReadonlySet<string> = new Set(["dataset", "filter"]);

/**
 * The format each `file` MIME type names, so the shared loadability rules
 * can match it. A MIME type missing here gives a file no format.
 */
const FILE_FORMAT_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  "application/pdf": "PDF",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPTX",
  "application/json": "JSON",
  "application/geo+json": "GEOJSON",
  "application/vnd.google-earth.kml+xml": "KML",
  "application/vnd.google-earth.kmz": "KMZ",
  "application/xml": "XML",
  "text/xml": "XML",
  "text/csv": "CSV",
  "text/plain": "TXT",
  "text/html": "HTML",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

/**
 * Whether a column is one of Socrata's computed region columns
 * (`:@computed_region_...`). The Discovery API lists them, but a `.csv`
 * export leaves them out, as it does every `:`-prefixed system field.
 */
function _isExportedColumn(column: SocrataDiscoveryColumn): boolean {
  return !column.fieldName.startsWith(":");
}

/**
 * One column, as text: the Discovery API's column list can be wrong, so its
 * type label is kept as the original type and the real type is verified
 * from the data later.
 */
function _toRelationColumn(column: SocrataDiscoveryColumn): RelationColumn {
  return {
    name: column.fieldName,
    originalDataType: column.dataType,
    castDataType: "VARCHAR",
  };
}

/** A `file` asset's format, from its MIME type without parameters. */
function _getFileFormat(blobMimeType: string | undefined): string | undefined {
  const mimeType = blobMimeType?.split(";")[0]?.trim().toLowerCase();
  return mimeType === undefined
    ? undefined
    : FILE_FORMAT_BY_MIME_TYPE[mimeType];
}

/**
 * Where a person or a later reader downloads the asset: a tabular view's
 * CSV export, or a file's own bytes, which Socrata redirects to from its
 * `/download` path.
 */
function _buildDownloadUrl(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
  isTabular: boolean;
}): string | undefined {
  const { drive, result } = params;
  if (params.isTabular) {
    return `${drive.baseUrl}/api/views/${result.datasetId}/rows.csv?accessType=DOWNLOAD`;
  }
  if (result.assetType === "file" && result.blobMimeType !== undefined) {
    return `${drive.baseUrl}/download/${result.datasetId}/${encodeURIComponent(result.blobMimeType)}`;
  }
  return undefined;
}

/**
 * Builds the one relation a discovered Socrata asset becomes. Every asset is
 * listed, whatever its type, and links to its page on the portal.
 *
 * A dataset or filtered view is read as `"CSV"`: `SocrataClient.getRows`
 * always fetches the `.csv` export, so that is what the listing is read as,
 * not a value from Socrata's metadata. Each column is named by its API field
 * name, which the export's header uses, and is text with unverified types
 * until the app verifies them from a sample. One with no column the export
 * includes is marked unloadable.
 *
 * Every other asset type is marked unloadable, with no columns. A `file`
 * takes its format from its MIME type.
 */
export function makeApiResourceRelationFromSocrataResult(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
}): ApiResourceRelation {
  const { drive, result } = params;
  const isTabular =
    result.assetType !== undefined && TABULAR_ASSET_TYPES.has(result.assetType);
  const columns = isTabular
    ? result.columns.filter(_isExportedColumn).map(_toRelationColumn)
    : [];
  const sourceDownloadUrl = _buildDownloadUrl({ drive, result, isTabular });
  return {
    kind: "api_resource",
    externalDatasetId: result.datasetId,
    apiResourceId: result.datasetId,
    apiResourceFormat: isTabular ? "CSV" : _getFileFormat(result.blobMimeType),
    displayName: result.name,
    externalOrganizationName: drive.organizationName,
    sourceUpdatedAt: new Date(result.updatedAt),
    ...(result.assetType === undefined
      ? {}
      : { sourceAssetType: result.assetType }),
    sourceUrl: `${drive.baseUrl}/d/${result.datasetId}`,
    ...(sourceDownloadUrl === undefined ? {} : { sourceDownloadUrl }),
    ...(isTabular && columns.length > 0 ? {} : { isWorkspaceLoadable: false }),
    columns,
  };
}
