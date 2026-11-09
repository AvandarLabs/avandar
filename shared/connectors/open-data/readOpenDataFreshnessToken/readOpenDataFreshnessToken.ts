import { propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/makeSourceVersionFromSocrataViewMetadata/makeSourceVersionFromSocrataViewMetadata.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { readFreshnessProbeToken } from "$/connectors/open-data/readFreshnessProbeToken/readFreshnessProbeToken.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataApiAccessFor } from "$/connectors/open-data/OpenDataApiAccess.types.ts";

type ApiResourceAccess = Extract<
  DataCatalogListing.Access,
  { kind: "api_resource" }
>;

/**
 * Reads the token the way the listing's `apiService` always reads it, for a
 * listing with no freshness probe. Undefined when the source no longer lists
 * the resource.
 */
async function _readServiceToken(params: {
  access: ApiResourceAccess;
  accessKind: string;
  http: Readonly<OpenDataHttp>;
}): Promise<string | undefined> {
  return await match(params.access)
    .with(
      { apiService: "ckan" },
      async (ckanAccess: OpenDataApiAccessFor<"ckan">) => {
        const ckanPackage = await createCkanClient(params.http).getPackage({
          baseUrl: ckanAccess.apiBaseUrl,
          ckanDatasetId: ckanAccess.externalDatasetId,
        });
        const resource = ckanPackage.resources.find(
          propEq("id", ckanAccess.apiResourceId),
        );
        return resource ? buildCkanSourceVersion(resource) : undefined;
      },
    )
    .with(
      { apiService: "socrata" },
      async (socrataAccess: OpenDataApiAccessFor<"socrata">) => {
        const metadata = await createSocrataClient(params.http).getMetadata({
          baseUrl: socrataAccess.apiBaseUrl,
          socrataDatasetId: socrataAccess.externalDatasetId,
        });
        return makeSourceVersionFromSocrataViewMetadata(metadata);
      },
    )
    .with({ apiService: "odata" }, async () => {
      // OData has no metadata call that says when a resource changed, so an
      // OData listing is only checked through the probe its pipeline wrote.
      throw new OpenDataAcquisitionFailed({
        code: "access-shape-invalid",
        accessKind: params.accessKind,
      });
    })
    .exhaustive();
}

/**
 * Reads one cheap, up-to-date freshness token for an `api_resource` entry,
 * such as when the `open-data` edge function decides whether a Parquet copy
 * is stale. A listing with a freshness probe is read through
 * `readFreshnessProbeToken`, whatever its `apiService`. Otherwise only the
 * source's metadata is read (`CkanClient.getPackage` /
 * `SocrataClient.getMetadata`), never its rows.
 *
 * @throws `OpenDataAcquisitionFailed` with `access-shape-invalid` when the
 *   entry is not API-backed, is an OData listing with no probe, or names a
 *   CKAN resource its dataset no longer lists.
 */
export async function readOpenDataFreshnessToken(params: {
  entry: Readonly<DataCatalogListing.T>;
  http: Readonly<OpenDataHttp>;
}): Promise<string> {
  const { entry, http } = params;
  const access = DataCatalogListing.toAccess(entry);
  if (!access || access.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: entry.accessKind,
    });
  }

  if (entry.apiFreshnessProbe) {
    return await readFreshnessProbeToken({
      probe: entry.apiFreshnessProbe,
      apiBaseUrl: access.apiBaseUrl,
      http,
    });
  }

  const token = await _readServiceToken({
    access,
    accessKind: entry.accessKind,
    http,
  });
  if (token === undefined) {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: entry.accessKind,
    });
  }
  return token;
}
