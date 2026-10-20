import {
  SocrataDiscoveryResponseSchema,
  SocrataDiscoveryResultSchema,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.schemas.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
  SocrataDiscoverySearchPage,
  SocrataSkippedResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types.ts";

const DISCOVERY_BASE_URL = "https://api.us.socrata.com/api/catalog/v1";

/** Reads a raw result's dataset id, if it has a string one. */
function _readDatasetId(rawResult: unknown): string | undefined {
  const id = (rawResult as { resource?: { id?: unknown } } | null)?.resource
    ?.id;
  return typeof id === "string" ? id : undefined;
}

/**
 * Validates each raw result on its own, so one malformed result is skipped
 * and reported rather than failing the page.
 */
function _splitValidResults(rawResults: readonly unknown[]): {
  results: SocrataDiscoveryResult[];
  skippedResults: SocrataSkippedResult[];
} {
  const results: SocrataDiscoveryResult[] = [];
  const skippedResults: SocrataSkippedResult[] = [];
  rawResults.forEach((rawResult) => {
    const parsed = SocrataDiscoveryResultSchema.safeParse(rawResult);
    if (!parsed.success) {
      skippedResults.push({
        datasetId: _readDatasetId(rawResult),
        reason: parsed.error.issues
          .map((issue) => {
            return `${issue.path.join(".")}: ${issue.message}`;
          })
          .join("; "),
      });
      return;
    }
    const { resource, metadata } = parsed.data;
    results.push({
      datasetId: resource.id,
      name: resource.name,
      domain: metadata.domain,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    });
  });
  return { results, skippedResults };
}

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
      order,
    }): Promise<SocrataDiscoverySearchPage> => {
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
      if (order !== undefined) {
        params.set("order", order);
      }
      const body = await http.get(
        `${DISCOVERY_BASE_URL}?${params.toString()}`,
      );
      const parsed = SocrataDiscoveryResponseSchema.parse(body);
      return {
        ..._splitValidResults(parsed.results),
        resultSetSize: parsed.resultSetSize,
      };
    },
  };
}
