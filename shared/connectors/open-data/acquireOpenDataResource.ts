import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { formatToContentKind } from "$/connectors/open-data/formatToContentKind.ts";
import { getCkanResourceFromPackage } from "$/connectors/open-data/getCkanResourceFromPackage.ts";
import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/makeSourceVersionFromSocrataViewMetadata/makeSourceVersionFromSocrataViewMetadata.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataAccess } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * The largest resource acquired by default. CKAN caps nothing itself, and real
 * resources run to tens of megabytes, so the ceiling has to come from the
 * caller. 64 MiB is a starting point, not a measured limit; a caller that knows
 * its own budget should pass one.
 */
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

/**
 * The largest Socrata dataset acquired by default, in rows. Checked against
 * the source's own row count before any data is fetched, mirroring
 * `DEFAULT_MAX_BYTES` for CKAN: Socrata's SODA API reports no byte size up
 * front, so the ceiling has to be a row count instead.
 */
const DEFAULT_MAX_ROWS = 1_000_000;

/** How the acquired bytes must be read. */
export type OpenDataContentKind = "parquet" | "csv";

/**
 * One open data resource's bytes, with what is known about where they came
 * from.
 */
export type OpenDataAcquisition = {
  /**
   * How the bytes must be read. `csv` still needs a transcode into Parquet,
   * which the caller does: transcoding needs a SQL engine, and importing one
   * here would put a browser-only client in the way of every test.
   */
  contentKind: OpenDataContentKind;

  bytes: Uint8Array<ArrayBuffer>;

  /**
   * An opaque change token, or undefined when the source reported nothing that
   * could serve as one. Evidence of change rather than proof of sameness.
   */
  sourceVersion: SourceVersion | undefined;

  /**
   * Whether the source reported a populated query endpoint for this resource.
   * Recorded and never acted on: reaching CKAN's datastore needs a credential
   * this code does not hold, so branching on it would create a path no test can
   * reach. Kept because it costs nothing and records how often the endpoint
   * exists.
   */
  datastoreActive: boolean;
};

/** The access shape `toAccess` produces for an `api_resource` entry. */
type OpenDataApiAccess = Extract<OpenDataAccess, { kind: "api_resource" }>;

/**
 * `OpenDataApiAccess` with `apiService` narrowed to one protocol. `Extract`
 * cannot do this narrowing itself: `apiService` is a plain field on a single
 * object type, not its own discriminated union member, so every `Extract`
 * candidate still has to satisfy the whole (wider) `apiService` type and
 * none do. Exported so other modules that need the same narrowing, such as
 * `readOpenDataFreshnessToken.ts`, import it instead of redefining it.
 */
export type OpenDataApiAccessFor<
  TService extends OpenDataApiAccess["apiService"],
> = Omit<OpenDataApiAccess, "apiService"> & { apiService: TService };

/** Reads a CKAN-hosted resource through `CkanClient`. */
async function _acquireCkanResource(
  access: Readonly<OpenDataApiAccessFor<"ckan">>,
  http: Readonly<OpenDataHttp>,
  maxBytes: number,
): Promise<OpenDataAcquisition> {
  const client = createCkanClient(http);
  const ckanPackage = await client.getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.externalDatasetId,
  });
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.apiResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes,
  });

  return {
    contentKind: formatToContentKind(resource.format),
    bytes: await client.getResourceBytes({
      ckanResourceId: resource.id,
      url: resource.url,
    }),
    sourceVersion: buildCkanSourceVersion(resource),
    datastoreActive: resource.datastore_active,
  };
}

/**
 * Reads a Socrata-hosted view through `SocrataClient`.
 *
 * The row count is checked against `maxRows` before any rows are fetched,
 * mirroring how the CKAN branch checks `size` before any bytes are fetched.
 * Socrata always answers in CSV: `SocrataClient.getRows` only ever requests
 * the view's `.csv` resource, so this branch never needs `formatToContentKind`.
 */
async function _acquireSocrataResource(
  access: Readonly<OpenDataApiAccessFor<"socrata">>,
  http: Readonly<OpenDataHttp>,
  maxRows: number,
): Promise<OpenDataAcquisition> {
  const client = createSocrataClient(http);
  const metadata = await client.getMetadata({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId: access.externalDatasetId,
  });
  const rowCount = await client.getRowCount({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId: access.externalDatasetId,
  });
  if (rowCount > maxRows) {
    throw new OpenDataAcquisitionFailed({
      code: "socrata-too-large",
      socrataDatasetId: access.externalDatasetId,
      rowCount,
      maxRows,
    });
  }
  const csv = await client.getRows({
    baseUrl: access.apiBaseUrl,
    socrataDatasetId: access.externalDatasetId,
    maxRows,
  });

  return {
    contentKind: "csv",
    bytes: new TextEncoder().encode(csv) as Uint8Array<ArrayBuffer>,
    sourceVersion: makeSourceVersionFromSocrataViewMetadata(metadata),
    datastoreActive: false,
  };
}

/**
 * Reads one API-backed open data catalog listing and returns its bytes.
 *
 * Dispatches on `access.apiService`: a CKAN entry's one metadata call does all
 * the discovery, since the same `package_show` response supplies the
 * resource's download URL, its format, its size, its change token, and
 * whether a query endpoint exists for it. A Socrata entry instead checks its
 * row count against `maxRows` before fetching, because SODA reports no byte
 * size up front.
 *
 * Pipeline-produced entries are refused rather than handled. Their rows are a
 * Parquet object reached a different way, and quietly taking that path here
 * would change how existing datasets load.
 *
 * @param params.http The HTTP layer. Injected, so this function reaches the
 *   network only through what the caller gives it. Note that a browser cannot
 *   read CKAN resource bytes directly: the download redirects to a presigned
 *   object-store URL and CKAN's redirect allows only its own origin, so
 *   `getBytes` has to run somewhere without that restriction.
 * @param params.maxBytes The largest CKAN resource to read, checked against
 *   the size the source reports before any bytes are fetched.
 * @param params.maxRows The largest Socrata dataset to read, checked against
 *   the row count the source reports before any rows are fetched.
 */
export async function acquireOpenDataResource(params: {
  entry: Readonly<DataCatalogListing.T>;
  http: Readonly<OpenDataHttp>;
  maxBytes?: number;
  maxRows?: number;
}): Promise<OpenDataAcquisition> {
  const access = DataCatalogListing.toAccess(params.entry);
  if (!access) {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }
  if (access.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: access.kind,
    });
  }

  return match(access)
    .with({ apiService: "ckan" }, (ckanAccess) => {
      return _acquireCkanResource(
        ckanAccess,
        params.http,
        params.maxBytes ?? DEFAULT_MAX_BYTES,
      );
    })
    .with({ apiService: "socrata" }, (socrataAccess) => {
      return _acquireSocrataResource(
        socrataAccess,
        params.http,
        params.maxRows ?? DEFAULT_MAX_ROWS,
      );
    })
    .exhaustive();
}
