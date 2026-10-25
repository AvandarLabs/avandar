import {
  SocrataDiscoveryResponseSchema,
  SocrataDiscoveryResultSchema,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.schemas.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
  SocrataDiscoverySearchPage,
  SocrataDiscoverySearchParams,
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
      columns: resource.columns_field_name.map((fieldName, index) => {
        return {
          fieldName,
          name: resource.columns_name[index] ?? fieldName,
          dataType: resource.columns_datatype[index] ?? "",
        };
      }),
    });
  });
  return { results, skippedResults };
}

/**
 * The Discovery API query for one search. A parameter given several values
 * is repeated, which the API reads as OR.
 *
 * @throws When `categories` or `tags` is given without `searchContext`.
 */
function _buildSearchParams(
  params: SocrataDiscoverySearchParams,
): URLSearchParams {
  const hasDomainFilter =
    (params.categories?.length ?? 0) > 0 || (params.tags?.length ?? 0) > 0;
  if (hasDomainFilter && params.searchContext === undefined) {
    throw new Error(
      `A Socrata search by categories or tags needs a searchContext, or the Discovery API matches nothing.`,
    );
  }
  const searchParams = new URLSearchParams();
  if (params.query !== undefined) {
    searchParams.set("q", params.query);
  }
  if (params.domains && params.domains.length > 0) {
    searchParams.set("domains", params.domains.join(","));
  }
  if (params.searchContext !== undefined) {
    searchParams.set("search_context", params.searchContext);
  }
  params.categories?.forEach((category) => {
    searchParams.append("categories", category);
  });
  params.tags?.forEach((tag) => {
    searchParams.append("tags", tag);
  });
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }
  if (params.order !== undefined) {
    searchParams.set("order", params.order);
  }
  return searchParams;
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
    search: async (params): Promise<SocrataDiscoverySearchPage> => {
      const body = await http.get(
        `${DISCOVERY_BASE_URL}?${_buildSearchParams(params).toString()}`,
      );
      const parsed = SocrataDiscoveryResponseSchema.parse(body);
      return {
        ..._splitValidResults(parsed.results),
        resultSetSize: parsed.resultSetSize,
      };
    },
  };
}
