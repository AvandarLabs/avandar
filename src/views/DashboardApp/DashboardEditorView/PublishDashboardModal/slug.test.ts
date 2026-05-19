import { describe, expect, it } from "vitest";
import { toVanitySlug } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug";

describe("toVanitySlug", () => {
  it("lowercases", () => {
    expect(toVanitySlug("MyReport")).toBe("myreport");
  });

  it("snake-cases spaces", () => {
    expect(toVanitySlug("my cholera report")).toBe("my_cholera_report");
  });

  it("collapses runs of non-alphanumeric to a single underscore", () => {
    expect(toVanitySlug("my  --  report")).toBe("my_report");
    expect(toVanitySlug("foo/bar/baz")).toBe("foo_bar_baz");
  });

  it("trims leading and trailing underscores", () => {
    expect(toVanitySlug("__report__")).toBe("report");
    expect(toVanitySlug(" report ")).toBe("report");
  });

  it("returns empty string for input that collapses to nothing", () => {
    expect(toVanitySlug("")).toBe("");
    expect(toVanitySlug("   ")).toBe("");
    expect(toVanitySlug("___")).toBe("");
    expect(toVanitySlug("!@#$%")).toBe("");
  });

  it("strips diacritics so accented characters don't break the slug", () => {
    expect(toVanitySlug("café review")).toBe("cafe_review");
    expect(toVanitySlug("número uno")).toBe("numero_uno");
  });

  it("caps at 64 characters", () => {
    const long = "a".repeat(200);
    expect(toVanitySlug(long).length).toBe(64);
  });

  it("preserves numbers", () => {
    expect(toVanitySlug("2024 q1 report")).toBe("2024_q1_report");
  });
});
