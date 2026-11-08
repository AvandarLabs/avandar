import { buildCkanSourceVersion } from "$/connectors/open-data/buildCkanSourceVersion";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { formatToContentKind } from "$/connectors/open-data/formatToContentKind";
import { getCkanResourceFromPackage } from "$/connectors/open-data/getCkanResourceFromPackage";
import type { ListingDownloadScript } from "@avandar/etl";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";

/**
 * Creates the HDX pipeline's download script. CKAN serves a resource only
 * as one file, so an HDX listing is downloaded whole. The resource is found
 * and host-checked exactly as the app's resource route does, but with no
 * size limit, because the pipeline server streams it to disk.
 *
 * @param args.createHttp - Creates the client that reads CKAN metadata from
 *   a drive's base URL.
 * @returns The download script.
 */
export function createHdxListingDownload(
  args: Readonly<{ createHttp: (baseUrl: string) => OpenDataHttp }>,
): ListingDownloadScript {
  return async ({ listing }) => {
    const ckanPackage = await createCkanClient(
      args.createHttp(listing.apiBaseUrl),
    ).getPackage({
      baseUrl: listing.apiBaseUrl,
      ckanDatasetId: listing.externalDatasetId,
    });
    const resource = getCkanResourceFromPackage({
      ckanPackage,
      ckanResourceId: listing.apiResourceId,
      baseUrl: listing.apiBaseUrl,
      expectedFormat: listing.apiResourceFormat ?? "CSV",
      maxBytes: Number.MAX_SAFE_INTEGER,
    });
    return {
      paging: false,
      url: resource.url,
      contentKind: formatToContentKind(resource.format),
      sourceVersion: buildCkanSourceVersion(resource),
    };
  };
}
