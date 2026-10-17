import { propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/makeSourceVersionFromSocrataViewMetadata/makeSourceVersionFromSocrataViewMetadata.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { OpenDataCatalogListing } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.ts";
import type { OpenDataApiAccessFor } from "$/connectors/open-data/acquireOpenDataResource.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/**
 * Reads one cheap, up-to-date freshness token for an `api_resource` entry.
 * Reads only the source's metadata (`CkanClient.getPackage` /
 * `SocrataClient.getMetadata`); never fetches its rows.
 */
export async function readOpenDataFreshnessToken(params: {
  entry: Readonly<OpenDataCatalogListing.T>;
  http: Readonly<OpenDataHttp>;
}): Promise<string> {
  const access = OpenDataCatalogListing.toAccess(params.entry);
  if (!access || access.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }

  // For both CKAN and Socrata this makes its own metadata call, independent of
  // whatever `acquireLive` does inside `acquireOpenDataResourceWithCache` -
  // the two are separate closures, each with their own call. On a cache miss
  // or a stale cached token, this means the metadata is fetched twice (once
  // here, once again inside the CKAN or Socrata branch of
  // `acquireOpenDataResource`), not once and reused. This is a known,
  // accepted inefficiency: de-duplicating it would mean threading the
  // metadata this function already fetched into `acquireLive`, which would
  // change `acquireOpenDataResourceWithCache`'s injected-function contracts
  // and is deliberately deferred rather than done now.
  const token = await match(access)
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
    .exhaustive();

  if (token === undefined) {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }
  return token;
}
