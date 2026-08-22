import { describe, expect, it } from "vitest";

import { makeVanitySlugFromText } from "@/views/DashboardApp/DashboardShareModal/makeVanitySlugFromText/makeVanitySlugFromText";

describe("makeVanitySlugFromText", () => {
  it("lowercases", () => {
    expect(makeVanitySlugFromText("MyReport")).toBe("myreport");
  });

  it("kebab-cases spaces", () => {
    expect(makeVanitySlugFromText("my cholera report")).toBe(
      "my-cholera-report",
    );
  });

  it("collapses runs of non-alphanumeric to a single dash", () => {
    expect(makeVanitySlugFromText("my  --  report")).toBe("my-report");
    expect(makeVanitySlugFromText("foo/bar/baz")).toBe("foo-bar-baz");
    expect(makeVanitySlugFromText("foo___bar")).toBe("foo-bar");
  });

  it("trims leading and trailing dashes", () => {
    expect(makeVanitySlugFromText("--report--")).toBe("report");
    expect(makeVanitySlugFromText(" report ")).toBe("report");
  });

  it("returns empty string for input that collapses to nothing", () => {
    expect(makeVanitySlugFromText("")).toBe("");
    expect(makeVanitySlugFromText("   ")).toBe("");
    expect(makeVanitySlugFromText("---")).toBe("");
    expect(makeVanitySlugFromText("!@#$%")).toBe("");
  });

  it("strips diacritics so accented characters don't break the slug", () => {
    expect(makeVanitySlugFromText("café review")).toBe("cafe-review");
    expect(makeVanitySlugFromText("número uno")).toBe("numero-uno");
  });

  it("caps at 64 characters", () => {
    const long = "a".repeat(200);
    expect(makeVanitySlugFromText(long).length).toBe(64);
  });

  it("preserves numbers", () => {
    expect(makeVanitySlugFromText("2024 q1 report")).toBe("2024-q1-report");
  });
});
