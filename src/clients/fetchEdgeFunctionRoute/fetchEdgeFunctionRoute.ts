import { AvaSupabase } from "$/db/supabase/AvaSupabase";

/**
 * Injectable in place of the real `fetch`, for tests. The minimal call
 * signature an edge function route call uses, not `typeof fetch` itself
 * (whose static `preconnect` member a plain stub does not implement).
 */
export type EdgeFunctionFetch = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Calls one edge function route with the caller's own Supabase session and
 * returns the raw `Response`, for a route whose body `APIClient` cannot hand
 * back as is: raw bytes, CSV, or a body whose headers matter.
 *
 * @param options `path` is everything after the functions URL, already
 *   encoded, such as `google-sheets/datasets/<id>/csv`.
 * @returns The route's response, whatever its status. Each caller
 *   classifies its own failures.
 * @throws When there is no signed-in session to call the route with.
 */
export async function fetchEdgeFunctionRoute(
  options: Readonly<{
    path: string;
    fetch?: EdgeFunctionFetch;
    method?: "GET" | "POST";
    body?: BodyInit;
    headers?: Record<string, string>;
  }>,
): Promise<Response> {
  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error(`No session is available to call '${options.path}'`);
  }
  const doFetch = options.fetch ?? fetch;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...options.headers,
  };
  const init: RequestInit = { headers };
  if (options.method !== undefined) {
    init.method = options.method;
  }
  if (options.body !== undefined) {
    init.body = options.body;
  }
  return await doFetch(
    `${AvaSupabase.getEdgeFunctionsURL()}/${options.path}`,
    init,
  );
}
