import {
  buildCkanActionUrl,
  unwrapCkanActionEnvelope,
} from "$/connectors/open-data/ckanActionApiHelpers.ts";
import { createCkanPackageFromWire } from "$/connectors/open-data/CkanClient/createCkanPackageFromWire/createCkanPackageFromWire.ts";
import {
  CkanPackageListResultSchema,
  CkanPackageSearchResultSchema,
} from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.schemas.ts";
import type {
  CkanPackage,
  OpenDataHttp,
} from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type {
  CkanDatasetSearchCursor,
  CkanDiscoveryClient,
} from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types.ts";

/**
 * Builds `package_search`'s `fq`. Without a cursor it is a plain range. With
 * one it is a keyset filter on both sort fields, because a range on the
 * timestamp alone would return the same page again whenever a whole page
 * shares one timestamp.
 */
function _buildModifiedFilter(params: {
  modifiedSince?: Date;
  modifiedBefore?: Date;
  after?: CkanDatasetSearchCursor;
}): string {
  const upperBound =
    params.modifiedBefore === undefined ?
      "*]"
    : `${params.modifiedBefore.toISOString()}}`;
  if (params.after === undefined) {
    const lowerBound =
      params.modifiedSince === undefined ?
        "[*"
      : `[${params.modifiedSince.toISOString()}`;
    return `metadata_modified:${lowerBound} TO ${upperBound}`;
  }
  // Solr reads a range bound up to the next space, `]` or `}`, so the
  // timestamp's `-`, `:` and `.` need no escaping. The exact-match term and
  // the name bound are quoted, which covers `-` in a CKAN slug.
  const cursorTimestamp = params.after.modifiedAt.toISOString();
  return (
    `(metadata_modified:{${cursorTimestamp} TO ${upperBound} OR ` +
    `(metadata_modified:"${cursorTimestamp}" AND ` +
    `name:{"${params.after.name}" TO *]))`
  );
}

/**
 * Lists and searches CKAN datasets over an injected HTTP layer.
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

    searchDatasets: async (params): Promise<CkanPackage[]> => {
      const url = buildCkanActionUrl({
        baseUrl: params.baseUrl,
        action: "package_search",
        query: {
          q: "*:*",
          fq: _buildModifiedFilter(params),
          sort: "metadata_modified asc,name asc",
          rows: String(params.rows),
          facet: "false",
        },
      });
      const result = unwrapCkanActionEnvelope(
        "package_search",
        await http.get(url),
      );
      return CkanPackageSearchResultSchema.parse(result).results.map(
        createCkanPackageFromWire,
      );
    },
  };
}
