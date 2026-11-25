import socrataDomains from "@pipelines/socrata/mappers/socrataDomains/socrataDomains";
import { describe, expect, it } from "vitest";

describe("socrataDomains", () => {
  it("lists the portal's category, then Socrata's categories", () => {
    expect(
      socrataDomains({
        classification: {
          domain_category: "Health",
          categories: ["health", "Health"],
        },
      }),
    ).toEqual(["Health", "health", "Health"]);
  });

  it("returns an empty list when the record has no categories", () => {
    expect(socrataDomains({})).toEqual([]);
  });
});
