import {
  buildCkanActionUrl,
  unwrapCkanActionEnvelope,
} from "$/connectors/open-data/ckanActionApiHelpers.ts";
import { CkanPackageSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { createCkanPackageFromWire } from "$/connectors/open-data/CkanClient/createCkanPackageFromWire/createCkanPackageFromWire.ts";
import {
  CkanPackageSearchResultSchema,
  CkanPackageSearchSortKeySchema,
} from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.schemas.ts";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp.ts";
import type { z } from "zod";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type {
  CkanDatasetSearchCursor,
  CkanDatasetSearchPage,
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
  // The leading `+` and the outer parentheses are load-bearing. CKAN joins
  // this `fq` with its own `+capacity:public` and `+state:...` clauses, and
  // on a deployment whose default operator is OR an unmarked clause is only
  // optional there: the filter would match every dataset and a crawl would
  // read its first page forever.
  const upperBound =
    params.modifiedBefore === undefined ?
      "*]"
    : `${params.modifiedBefore.toISOString()}}`;
  if (params.after === undefined) {
    const lowerBound =
      params.modifiedSince === undefined ?
        "[*"
      : `[${params.modifiedSince.toISOString()}`;
    return `+metadata_modified:${lowerBound} TO ${upperBound}`;
  }
  // Solr reads a range bound up to the next space, `]` or `}`, so the
  // timestamp's `-`, `:` and `.` need no escaping. The exact-match term and
  // the name bound are quoted, with `\` and `"` escaped inside the quotes.
  const cursorTimestamp = params.after.modifiedAt.toISOString();
  const quotedName = params.after.name.replace(/[\\"]/g, "\\$&");
  return (
    `+(metadata_modified:{${cursorTimestamp} TO ${upperBound} OR ` +
    `(metadata_modified:"${cursorTimestamp}" AND ` +
    `name:{"${quotedName}" TO *]))`
  );
}

/** Summarizes a validation failure on one line, field paths first. */
function _buildIssueSummary(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      return `${issue.path.join(".")}: ${issue.message}`;
    })
    .join("; ");
}

/**
 * Reads where one raw result sits in the sort order.
 *
 * @throws When it has no usable `name` or `metadata_modified`.
 */
function _readSortKey(rawResult: unknown): {
  name: string;
  metadataModified: string;
  modifiedAt: Date;
} {
  const parsed = CkanPackageSearchSortKeySchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new Error(
      `A CKAN package_search result has no usable name or metadata_modified, so the crawl cannot move past it: ${_buildIssueSummary(parsed.error)}`,
    );
  }
  const { name, metadata_modified: metadataModified } = parsed.data;
  return {
    name,
    metadataModified,
    modifiedAt: parseCkanTimestamp(metadataModified),
  };
}

/**
 * Validates each raw result on its own, so one bad dataset is skipped rather
 * than failing the page, and places the cursor at the last raw result.
 */
function _buildSearchPage(
  rawResults: readonly unknown[],
): CkanDatasetSearchPage {
  const rows = rawResults.map((rawResult) => {
    return {
      sortKey: _readSortKey(rawResult),
      parsed: CkanPackageSchema.safeParse(rawResult),
    };
  });
  const lastSortKey = rows.at(-1)?.sortKey;
  return {
    datasets: rows.flatMap(({ parsed }) => {
      return parsed.success ? [createCkanPackageFromWire(parsed.data)] : [];
    }),
    skippedDatasets: rows.flatMap(({ sortKey, parsed }) => {
      return parsed.success ? [] : (
          [
            {
              name: sortKey.name,
              metadataModified: sortKey.metadataModified,
              reason: _buildIssueSummary(parsed.error),
            },
          ]
        );
    }),
    nextCursor:
      lastSortKey === undefined ? undefined : (
        { modifiedAt: lastSortKey.modifiedAt, name: lastSortKey.name }
      ),
    resultCount: rawResults.length,
  };
}

/**
 * Searches CKAN datasets over an injected HTTP layer.
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
    searchDatasets: async (params): Promise<CkanDatasetSearchPage> => {
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
      const parsed = CkanPackageSearchResultSchema.safeParse(
        unwrapCkanActionEnvelope("package_search", await http.get(url)),
      );
      if (!parsed.success) {
        throw new Error(
          `CKAN package_search returned a malformed result: ${_buildIssueSummary(parsed.error)}`,
          { cause: parsed.error },
        );
      }
      return _buildSearchPage(parsed.data.results);
    },
  };
}
