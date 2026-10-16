import { SocrataDiscoveryResponseSchema } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.schemas.ts";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const DISCOVERY_BASE_URL = "https://api.us.socrata.com/api/catalog/v1";

/**
 * Searches Socrata's cross-portal Discovery API over an injected HTTP layer.
 *
 * Stateless, mirroring `CkanClient` and `SocrataClient`. A network failure
 * from `http.getJson` propagates raw rather than being wrapped in a structured
 * error: `openDataErrors.ts` defines no code for a Discovery API failure
 * specifically, and inventing one here would be ahead of what this task
 * needs.
 */
export function createSocrataDiscoveryClient(
  http: Readonly<OpenDataHttp>,
): SocrataDiscoveryClient {
  return {
    search: async ({
      query,
      domains,
      limit,
    }): Promise<SocrataDiscoveryResult[]> => {
      const params = new URLSearchParams({ q: query });
      if (domains && domains.length > 0) {
        params.set("domains", domains.join(","));
      }
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }
      const body = await http.getJson(
        `${DISCOVERY_BASE_URL}?${params.toString()}`,
      );
      const parsed = SocrataDiscoveryResponseSchema.parse(body);
      return parsed.results.map((result) => {
        return {
          datasetId: result.resource.id,
          name: result.resource.name,
          domain: result.metadata.domain,
        };
      });
    },
  };
}
