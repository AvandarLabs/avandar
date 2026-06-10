import { describe, expect, it } from "vitest";
import { makeCacheBuster } from "@/lib/offline/queryPersister";

describe("makeCacheBuster", () => {
  it("includes user id in the buster", () => {
    expect(makeCacheBuster("user-123")).toContain("user-123");
  });

  it("uses anon when user id is undefined", () => {
    expect(makeCacheBuster(undefined)).toContain("anon");
  });
});
