import { describe, expect, it } from "vitest";
import { getRemoteSupabaseRefusal } from "./requireLocalSupabase";

describe("getRemoteSupabaseRefusal", () => {
  it.each([
    "http://127.0.0.1:54321",
    "http://localhost:55421",
    "http://[::1]:54321",
  ])("allows the loopback address %s", (url) => {
    expect(getRemoteSupabaseRefusal({ SUPABASE_URL: url })).toBeUndefined();
  });

  it.each([
    ["no URL", {}],
    ["a hosted project", { SUPABASE_URL: "https://abcdefgh.supabase.co" }],
    ["a URL that is not one", { SUPABASE_URL: "not a url" }],
    ["a look-alike host", { SUPABASE_URL: "http://localhost.example.com" }],
    [
      "a hosted browser URL beside a local server URL",
      {
        SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_API_URL: "https://abcdefgh.supabase.co",
      },
    ],
    [
      "a worktree switched to a hosted project",
      {
        SUPABASE_URL: "http://127.0.0.1:54321",
        AVA_SUPABASE_REMOTE_PROJECT_ID: "abcdefgh",
      },
    ],
  ])("refuses %s", (_name, env) => {
    expect(getRemoteSupabaseRefusal(env)).toEqual(expect.any(String));
  });
});
