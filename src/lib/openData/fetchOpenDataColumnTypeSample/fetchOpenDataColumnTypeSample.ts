import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/** A listing's column type sample and the token that vouches for it. */
export type OpenDataColumnTypeSample = Readonly<{
  csvText: string;
  token: string;
}>;

/** The open-data edge function's URL for one catalog listing. */
export function buildOpenDataListingUrl(
  catalogListingId: DataCatalogListing.Id,
): string {
  return (
    `${AvaSupabase.getEdgeFunctionsURL()}/open-data/data-catalog-listings/` +
    encodeURIComponent(catalogListingId)
  );
}

/**
 * Reads the current session's access token.
 *
 * @throws When no one is signed in.
 */
export async function readOpenDataAccessToken(): Promise<string> {
  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error("No session is available to read open data");
  }
  return accessToken;
}

/** The failure code a refused sample response names, if it names one. */
async function _readSampleFailureCode(
  response: Response,
): Promise<string | undefined> {
  try {
    const body = (await response.json()) as {
      error?: { code?: unknown };
    };
    return typeof body.error?.code === "string" ? body.error.code : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the start of an API-backed CSV listing's data through the open-data
 * edge function: the first rows of a Socrata export, or the first megabytes
 * of a CKAN file cut back to a whole line. Only the start is read, so the
 * size of the source sets no limit. The server gzips the sample and `fetch`
 * gunzips it, so this reads plain text.
 *
 * A sample the server cannot read may mark the listing invalid on the
 * server's side, when the failure says the dataset itself cannot be loaded.
 *
 * @param catalogListingId The listing.
 * @param options.accessToken The caller's token, when it is already read.
 * @throws When the sample cannot be read, naming the server's failure code.
 */
export async function fetchOpenDataColumnTypeSample(
  catalogListingId: DataCatalogListing.Id,
  options: { accessToken?: string } = {},
): Promise<OpenDataColumnTypeSample> {
  const accessToken = options.accessToken ?? (await readOpenDataAccessToken());
  const response = await fetch(
    `${buildOpenDataListingUrl(catalogListingId)}/column-type-sample`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const code = await _readSampleFailureCode(response);
    const codeNote = code === undefined ? "" : ` (${code})`;
    throw new Error(
      `Column type sample fetch failed: ${response.status}${codeNote}`,
    );
  }
  return {
    token: response.headers.get("X-Ava-Column-Type-Token") ?? "",
    csvText: await response.text(),
  };
}
