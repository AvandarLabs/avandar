import {
  readSupabaseTarget,
  SUPABASE_KEY_HEADER,
  SUPABASE_TARGET_ERROR_NAME,
  SUPABASE_URL_HEADER,
} from "@pipeline-server/routes/pipeline-name/readSupabaseTarget/readSupabaseTarget";
import { describe, expect, it } from "vitest";

function _read(url: unknown, key: unknown) {
  return readSupabaseTarget({
    [SUPABASE_URL_HEADER]: url,
    [SUPABASE_KEY_HEADER]: key,
  });
}

describe("readSupabaseTarget", () => {
  it("reads the project's URL and service role key", () => {
    expect(_read("https://abcd.supabase.co/", "service-key")).toEqual({
      url: "https://abcd.supabase.co",
      serviceRoleKey: "service-key",
    });
  });

  it.each([
    "http://127.0.0.1:54321",
    "http://localhost:54321",
    "http://host.docker.internal:54321",
  ])("accepts a local stack over http: %s", (url) => {
    expect(_read(url, "service-key").url).toBe(url);
  });

  it.each([
    ["no URL", undefined, "service-key", SUPABASE_URL_HEADER],
    ["no key", "https://abcd.supabase.co", undefined, SUPABASE_KEY_HEADER],
    ["a blank key", "https://abcd.supabase.co", "  ", SUPABASE_KEY_HEADER],
    ["a URL that is not one", "abcd", "service-key", SUPABASE_URL_HEADER],
    [
      "a remote URL over http",
      "http://abcd.supabase.co",
      "service-key",
      "https",
    ],
    [
      "a URL with a path",
      "https://abcd.supabase.co/rest/v1",
      "service-key",
      "path",
    ],
  ])("refuses %s", (_label, url, key, message) => {
    expect(() => {
      return _read(url, key);
    }).toThrow(
      expect.objectContaining({
        name: SUPABASE_TARGET_ERROR_NAME,
        message: expect.stringContaining(message),
      }),
    );
  });

  it("never repeats the key in an error", () => {
    expect(() => {
      return _read("http://abcd.supabase.co", "very-secret-key");
    }).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("very-secret-key"),
      }),
    );
  });
});
