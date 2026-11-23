import { bucketFiltersByOperator } from "@utils/filters/bucketFiltersByOperator/bucketFiltersByOperator.ts";
import { describe, expect, it } from "vitest";

describe("bucketFiltersByOperator", () => {
  it("converts column filters into operator filters", () => {
    const result = bucketFiltersByOperator({
      status: { eq: "active" },
      id: { in: ["1", "2"] },
    });

    expect(result).toEqual({
      eq: [["status", "active"]],
      in: [["id", ["1", "2"]]],
    });
  });

  it("keeps an is-null filter in the operator shape", () => {
    const result = bucketFiltersByOperator({
      assignee: { is: null },
      status: { eq: "active" },
    });

    expect(result).toEqual({
      is: [["assignee", null]],
      eq: [["status", "active"]],
    });
  });

  it("ignores operator values with invalid types", () => {
    const result = bucketFiltersByOperator({
      status: { eq: ["bad", "value"] as unknown as string },
    });

    expect(result).toEqual({ eq: [] });
  });

  it("returns an empty object when no filters exist", () => {
    expect(bucketFiltersByOperator(undefined)).toEqual({});
    expect(bucketFiltersByOperator({})).toEqual({});
  });
});
