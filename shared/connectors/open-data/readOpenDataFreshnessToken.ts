import { match } from "ts-pattern";
import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion.ts";
import { buildSocrataSourceVersion } from "$/connectors/open-data/buildSocrataSourceVersion.ts";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataApiAccessFor } from "$/connectors/open-data/acquireOpenDataResource.ts";
import { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/**
 * Reads one cheap, up-to-date freshness token for an `api_resource` entry,
 * without fetching its rows. For CKAN this is the same `package_show` call
 * acquisition needs anyway; for Socrata it is a separate, equally cheap
 * metadata call.
 */
export async function readOpenDataFreshnessToken(params: {
  entry: Readonly<OpenDataCatalogEntry.T>;
  http: Readonly<OpenDataHttp>;
}): Promise<string> {
  const access = OpenDataCatalogEntry.toAccess(params.entry);
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
        const resource = ckanPackage.resources.find((candidate) => {
          return candidate.id === ckanAccess.apiResourceId;
        });
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
        return buildSocrataSourceVersion(metadata);
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
