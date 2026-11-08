import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { formatToContentKind } from "$/connectors/open-data/formatToContentKind";
import { getCkanResourceFromPackage } from "$/connectors/open-data/getCkanResourceFromPackage";
import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/makeSourceVersionFromSocrataViewMetadata/makeSourceVersionFromSocrataViewMetadata";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient";
import type { OpenDataContentKind } from "$/connectors/open-data/acquireOpenDataResource";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

type ApiAccess = Extract<DataCatalogListing.Access, { kind: "api_resource" }>;

/** Where an API-backed listing's whole source is downloaded from. */
export type OpenDataSourceDownload = Readonly<{
  url: string;
  contentKind: OpenDataContentKind;
  /** The source's freshness token, when it reports one. */
  sourceVersion: string | undefined;
}>;

function _trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function _resolveCkanDownload(
  access: Readonly<ApiAccess>,
  http: Readonly<OpenDataHttp>,
): Promise<OpenDataSourceDownload> {
  const ckanPackage = await createCkanClient(http).getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.externalDatasetId,
  });
  // The file is streamed to disk, so its size sets no limit.
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.apiResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes: Number.MAX_SAFE_INTEGER,
  });
  return {
    url: resource.url,
    contentKind: formatToContentKind(resource.format),
    sourceVersion: buildCkanSourceVersion(resource),
  };
}

async function _resolveSocrataDownload(
  access: Readonly<ApiAccess>,
  http: Readonly<OpenDataHttp>,
): Promise<OpenDataSourceDownload> {
  const client = createSocrataClient(http);
  const socrataDatasetId = access.externalDatasetId;
  const metadata = await client.getMetadata({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId,
  });
  const rowCount = await client.getRowCount({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId,
  });
  if (rowCount === 0) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-empty",
      ckanResourceId: socrataDatasetId,
    });
  }
  // The same CSV resource the column type sample reads, so the copy's
  // column names match the catalog's. SODA returns 1,000 rows unless told
  // otherwise, so the limit is the dataset's own row count.
  const root = _trimTrailingSlash(access.apiBaseUrl);
  return {
    url: `${root}/resource/${socrataDatasetId}.csv?%24limit=${rowCount}`,
    contentKind: "csv",
    sourceVersion: makeSourceVersionFromSocrataViewMetadata(metadata),
  };
}

/**
 * Finds where an API-backed listing's whole source can be downloaded, with
 * the freshness token of what will be downloaded. A CKAN resource is found
 * and host-checked exactly as `acquireOpenDataResource` does, but with no
 * size limit, because the caller streams it to disk rather than holding it.
 *
 * @param options.access The listing's API access.
 * @param options.http Reads CKAN and Socrata metadata.
 * @throws `OpenDataAcquisitionFailed` when the source cannot be found or
 *   read.
 */
export async function resolveOpenDataSourceDownload(
  options: Readonly<{ access: ApiAccess; http: OpenDataHttp }>,
): Promise<OpenDataSourceDownload> {
  const { access, http } = options;
  return await match(access.apiService)
    .with("ckan", () => {
      return _resolveCkanDownload(access, http);
    })
    .with("socrata", () => {
      return _resolveSocrataDownload(access, http);
    })
    .exhaustive();
}
