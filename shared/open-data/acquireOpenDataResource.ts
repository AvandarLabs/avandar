import { createCkanClient } from "$/open-data/CkanClient/CkanClient.ts";
import { buildCkanSourceVersion } from "$/open-data/buildCkanSourceVersion.ts";
import { getCkanResourceFromPackage } from "$/open-data/getCkanResourceFromPackage.ts";
import { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";
import { OpenDataAcquisitionFailed } from "$/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/open-data/CkanClient/CkanClient.types.ts";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * The largest resource acquired by default. CKAN caps nothing itself, and real
 * resources run to tens of megabytes, so the ceiling has to come from the
 * caller. 64 MiB is a starting point, not a measured limit; a caller that knows
 * its own budget should pass one.
 */
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

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

/** Maps a CKAN resource format onto how its bytes must be read. */
function _toContentKind(format: string): OpenDataContentKind {
  return format.toLowerCase() === "parquet" ? "parquet" : "csv";
}

/**
 * Reads one API-backed open data catalog entry and returns its bytes.
 *
 * One metadata call does all the discovery: the same `package_show` response
 * supplies the resource's download URL, its format, its size, its change token,
 * and whether a query endpoint exists for it. Nothing else is requested before
 * the bytes themselves.
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
 * @param params.maxBytes The largest resource to read, checked against the
 *   size the source reports before any bytes are fetched.
 */
export async function acquireOpenDataResource(params: {
  entry: Readonly<OpenDataCatalogEntry.T>;
  http: Readonly<OpenDataHttp>;
  maxBytes?: number;
}): Promise<OpenDataAcquisition> {
  const access = OpenDataCatalogEntry.toAccess(params.entry);
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

  const client = createCkanClient(params.http);
  const ckanPackage = await client.getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.ckanDatasetId,
  });
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.ckanResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes: params.maxBytes ?? DEFAULT_MAX_BYTES,
  });

  return {
    contentKind: _toContentKind(resource.format),
    bytes: await client.getResourceBytes({
      ckanResourceId: resource.id,
      url: resource.url,
    }),
    sourceVersion: buildCkanSourceVersion(resource),
    datastoreActive: resource.datastore_active,
  };
}
