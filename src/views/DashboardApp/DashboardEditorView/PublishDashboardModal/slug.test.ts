import { describe, expect, it } from "vitest";
import { toVanitySlug } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug";

describe("toVanitySlug", () => {
  it("lowercases", () => {
    expect(toVanitySlug("MyReport")).toBe("myreport");
  });

  it("kebab-cases spaces", () => {
    expect(toVanitySlug("my cholera report")).toBe("my-cholera-report");
  });

  it("collapses runs of non-alphanumeric to a single dash", () => {
    expect(toVanitySlug("my  --  report")).toBe("my-report");
    expect(toVanitySlug("foo/bar/baz")).toBe("foo-bar-baz");
    expect(toVanitySlug("foo___bar")).toBe("foo-bar");
  });

  it("trims leading and trailing dashes", () => {
    expect(toVanitySlug("--report--")).toBe("report");
    expect(toVanitySlug(" report ")).toBe("report");
  });

  it("returns empty string for input that collapses to nothing", () => {
    expect(toVanitySlug("")).toBe("");
    expect(toVanitySlug("   ")).toBe("");
    expect(toVanitySlug("---")).toBe("");
    expect(toVanitySlug("!@#$%")).toBe("");
  });

  it("strips diacritics so accented characters don't break the slug", () => {
    expect(toVanitySlug("café review")).toBe("cafe-review");
    expect(toVanitySlug("número uno")).toBe("numero-uno");
  });

  it("caps at 64 characters", () => {
    const long = "a".repeat(200);
    expect(toVanitySlug(long).length).toBe(64);
  });

  it("preserves numbers", () => {
    expect(toVanitySlug("2024 q1 report")).toBe("2024-q1-report");
  });
});
