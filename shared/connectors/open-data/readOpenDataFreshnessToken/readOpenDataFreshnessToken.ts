import { propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { makeSourceVersionFromSocrataViewMetadata } from "$/connectors/open-data/makeSourceVersionFromSocrataViewMetadata/makeSourceVersionFromSocrataViewMetadata.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataApiAccessFor } from "$/connectors/open-data/OpenDataApiAccess.types.ts";

/**
 * Reads one cheap, up-to-date freshness token for an `api_resource` entry.
 * Reads only the source's metadata (`CkanClient.getPackage` /
 * `SocrataClient.getMetadata`); never fetches its rows.
 */
export async function readOpenDataFreshnessToken(params: {
  entry: Readonly<DataCatalogListing.T>;
  http: Readonly<OpenDataHttp>;
}): Promise<string> {
  const access = DataCatalogListing.toAccess(params.entry);
  if (!access || access.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }

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
