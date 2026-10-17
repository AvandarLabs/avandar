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
 * Stateless, mirroring `CkanClient` and `SocrataClient`'s shape. Unlike
 * `SocrataClient`, this client does not convert failures into a structured
 * `OpenDataAcquisitionFailed` error: `openDataErrors.ts` has no failure code
 * for the Discovery API, and none is introduced here. An HTTP or
 * schema-validation failure propagates as a raw exception.
 */
export function createSocrataDiscoveryClient(
  http: Readonly<OpenDataHttp>,
): SocrataDiscoveryClient {
  return {
    search: async ({
      query,
      domains,
      limit,
      offset,
    }): Promise<SocrataDiscoveryResult[]> => {
      const params = new URLSearchParams();
      if (query !== undefined) {
        params.set("q", query);
      }
      if (domains && domains.length > 0) {
        params.set("domains", domains.join(","));
      }
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }
      if (offset !== undefined) {
        params.set("offset", String(offset));
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
