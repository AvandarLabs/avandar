import {
  buildCkanActionUrl,
  unwrapCkanActionEnvelope,
} from "$/connectors/open-data/ckanActionApiHelpers.ts";
import { CkanPackageListResultSchema } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.schemas.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types.ts";

/**
 * Lists CKAN dataset slugs over an injected HTTP layer.
 *
 * Stateless, mirroring `CkanClient`'s shape: every call takes its base URL
 * as an argument, so one client serves any number of CKAN deployments.
 * Separate from `CkanClient` because it discovers *which* datasets exist
 * rather than reading one already-known dataset - the same split
 * `SocrataDiscoveryClient` already draws against `SocrataClient`.
 */
export function createCkanDiscoveryClient(
  http: Readonly<OpenDataHttp>,
): CkanDiscoveryClient {
  return {
    listDatasets: async ({ baseUrl }): Promise<string[]> => {
      const url = buildCkanActionUrl({
        baseUrl,
        action: "package_list",
        query: {},
      });
      const result = unwrapCkanActionEnvelope(
        "package_list",
        await http.get(url),
      );
      return CkanPackageListResultSchema.parse(result);
    },
  };
}
