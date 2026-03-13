import { describe, expect, it } from "vitest";
import { where } from "./where.ts";

type Row = { id: string };

describe("where", () => {
  it("creates single-value filters", () => {
    const { where: filters } = where<Row, "id">("id", "eq", "abc");
    expect(filters).toEqual({ id: { eq: "abc" } });
  });

  it("creates array-value filters", () => {
    const { where: filters } = where<Row, "id">("id", "in", ["abc"]);
    expect(filters).toEqual({ id: { in: ["abc"] } });
  });
});
