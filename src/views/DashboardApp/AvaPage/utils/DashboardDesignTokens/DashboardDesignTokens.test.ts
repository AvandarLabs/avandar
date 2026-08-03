import { describe, expect, it } from "vitest";
import { DashboardDesignTokens } from "@/views/DashboardApp/AvaPage/utils/DashboardDesignTokens/DashboardDesignTokens";

describe("getDashboardDesignTokens", () => {
  it("returns the default tokens when nothing is configured", () => {
    const tokens = DashboardDesignTokens.get({
      theme: undefined,
      typography: undefined,
    });
    expect(tokens.accentColor).toBe("var(--mantine-color-primary-6)");
    expect(tokens.bodyFontFamily).toContain("-apple-system");
    expect(tokens.headingFontFamily).toContain("-apple-system");
  });

  it("switches heading font for the serif preset", () => {
    const tokens = DashboardDesignTokens.get({
      theme: "default",
      typography: "serif",
    });
    expect(tokens.headingFontFamily).toContain("Source Serif Pro");
  });

  it("switches heading font for the mono preset", () => {
    const tokens = DashboardDesignTokens.get({
      theme: "default",
      typography: "mono",
    });
    expect(tokens.headingFontFamily).toContain("IBM Plex Mono");
  });

  it("returns different accent colors per theme", () => {
    const ocean = DashboardDesignTokens.get({
      theme: "ocean",
      typography: "system",
    });
    const forest = DashboardDesignTokens.get({
      theme: "forest",
      typography: "system",
    });
    expect(ocean.accentColor).toBe("#0E7490");
    expect(forest.accentColor).toBe("#15803D");
  });
});
