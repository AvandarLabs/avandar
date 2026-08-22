import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { OpenDataContentKind } from "$/open-data/acquireOpenDataResource";

import { AvaSupabase } from "$/db/supabase/AvaSupabase";

/** One catalog resource as the open-data edge function returns it. */
export type FetchedOpenDataCatalogResource = {
  contentKind: OpenDataContentKind;
  bytes: Uint8Array<ArrayBuffer>;
  sourceVersion: SourceVersion | undefined;
};

/**
 * Reads one API-backed catalog resource through the open-data edge function.
 *
 * A browser cannot fetch CKAN resource bytes itself: the download redirects to
 * a presigned URL whose CORS header names only the CKAN host. This call is
 * that proxy. The caller sends a catalog entry id and nothing else.
 *
 * @param catalogEntryId The catalog row that names the resource.
 * @returns The resource bytes, how they must be read, and any source version.
 */
export async function fetchOpenDataCatalogResource(
  catalogEntryId: OpenDataCatalogEntry.Id,
): Promise<FetchedOpenDataCatalogResource> {
  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error("No session is available to fetch open data");
  }

  const url =
    `${AvaSupabase.getEdgeFunctionsURL()}/open-data/catalog-entries/` +
    `${encodeURIComponent(catalogEntryId)}/resource`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Open data resource fetch failed: ${response.status}`);
  }

  const contentKind = response.headers.get("X-Ava-Content-Kind");
  if (contentKind !== "parquet" && contentKind !== "csv") {
    throw new Error("Open data resource response omitted a content kind");
  }

  return {
    contentKind,
    bytes: new Uint8Array(
      await response.arrayBuffer(),
    ) as Uint8Array<ArrayBuffer>,
    sourceVersion: response.headers.get("X-Ava-Source-Version") ?? undefined,
  };
}
