import type { User } from "$/models/User/User";

import { describe, expect, it } from "vitest";

import { makeCacheBuster } from "@/components/providers/AvandarQueryClientProvider/queryPersister/queryPersister";

describe("makeCacheBuster", () => {
  it("includes user id in the buster", () => {
    expect(makeCacheBuster("user-123" as User.Id)).toContain("user-123");
  });

  it("uses anon when user id is undefined", () => {
    expect(makeCacheBuster(undefined)).toContain("anon");
  });
});
