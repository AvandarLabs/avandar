import { describe, expect, it } from "vitest";
import { makeColumnNameSlugFromName } from "./makeColumnNameSlugFromName";

describe("makeColumnNameSlugFromName", () => {
  it("keeps a name that is already lowercase snake case", () => {
    expect(makeColumnNameSlugFromName("case_count")).toBe("case_count");
  });

  it("lowercases letters", () => {
    expect(makeColumnNameSlugFromName("Cases")).toBe("cases");
  });

  it("turns each run of other characters into one underscore", () => {
    expect(makeColumnNameSlugFromName("New cases - (7d)")).toBe("new_cases_7d");
  });

  it("trims underscores from both ends", () => {
    expect(makeColumnNameSlugFromName("__cases__")).toBe("cases");
    expect(makeColumnNameSlugFromName("  Cases!  ")).toBe("cases");
  });

  it("drops letters outside a to z", () => {
    expect(makeColumnNameSlugFromName("Població")).toBe("poblaci");
  });

  it("prefixes c_ when the slug starts with a digit", () => {
    expect(makeColumnNameSlugFromName("2024 cases")).toBe("c_2024_cases");
  });

  it("returns value when nothing is left", () => {
    expect(makeColumnNameSlugFromName("")).toBe("value");
    expect(makeColumnNameSlugFromName("%%%")).toBe("value");
  });

  it.each(["Case Count", "7-day", "___", "Ünïcödé", "a1_B2"])(
    "makes a name the host accepts from %j",
    (name) => {
      expect(makeColumnNameSlugFromName(name)).toMatch(/^[a-z][a-z0-9_]*$/);
    },
  );
});
