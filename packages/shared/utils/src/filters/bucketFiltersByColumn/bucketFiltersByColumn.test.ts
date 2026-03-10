import { describe, expect, it } from "vitest";
import { bucketFiltersByColumn } from "./bucketFiltersByColumn.ts";

describe("bucketFiltersByColumn", () => {
  it("converts operator filters into column filters", () => {
    const result = bucketFiltersByColumn({
      eq: [["status", "active"]],
      in: [["id", ["1", "2"]]],
    });

    expect(result).toEqual({
      status: { eq: "active" },
      id: { in: ["1", "2"] },
    });
  });

  it("drops tuples with incorrect value types", () => {
    const result = bucketFiltersByColumn({
      eq: [["status", ["should", "be", "string"] as unknown as string]],
    });

    expect(result).toEqual({ status: {} });
  });

  it("returns an empty object when no filters exist", () => {
    expect(bucketFiltersByColumn(undefined)).toEqual({});
    expect(bucketFiltersByColumn({})).toEqual({});
  });
});
