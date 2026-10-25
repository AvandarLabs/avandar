/** The access token the mocked signed-in session carries. */
export const MOCK_SESSION_ACCESS_TOKEN = "session-token";

/** The edge functions URL the mocked Supabase client reports. */
export const MOCK_EDGE_FUNCTIONS_URL = "https://edge.test/functions/v1";

/** The part of the `AvaSupabase` module an edge function route call reads. */
type AvaSupabaseSessionMock = {
  AvaSupabase: {
    db: () => {
      auth: {
        getSession: () => Promise<{
          data: { session: { access_token: string } };
        }>;
      };
    };
    getEdgeFunctionsURL: () => string;
  };
};

/**
 * A stand-in for the `$/db/supabase/AvaSupabase` module with one signed-in
 * session, for tests of code that calls an edge function route directly. Use
 * it as a `vi.mock` factory:
 *
 * ```ts
 * vi.mock("$/db/supabase/AvaSupabase", async () => {
 *   return (
 *     await import("@/test-utils/createAvaSupabaseSessionMock")
 *   ).createAvaSupabaseSessionMock();
 * });
 * ```
 *
 * @returns The mocked module, whose session carries
 *   {@link MOCK_SESSION_ACCESS_TOKEN} and whose edge functions URL is
 *   {@link MOCK_EDGE_FUNCTIONS_URL}.
 */
export function createAvaSupabaseSessionMock(): AvaSupabaseSessionMock {
  return {
    AvaSupabase: {
      db: () => {
        return {
          auth: {
            getSession: async () => {
              return {
                data: { session: { access_token: MOCK_SESSION_ACCESS_TOKEN } },
              };
            },
          },
        };
      },
      getEdgeFunctionsURL: () => {
        return MOCK_EDGE_FUNCTIONS_URL;
      },
    },
  };
}
