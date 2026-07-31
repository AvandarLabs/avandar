import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import { describe, expect, it } from "vitest";

describe("cleanLlmGeneratedSql", () => {
  it("strips ``` fencing", () => {
    expect(cleanLlmGeneratedSql("```\nSELECT 1\n```")).toBe("SELECT 1");
  });

  it("strips a leading sql language hint", () => {
    expect(cleanLlmGeneratedSql("sql SELECT 1")).toBe("SELECT 1");
  });
});
