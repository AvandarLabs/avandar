import { describe, expect, it } from "vitest";
import { toPdfSafeText } from "@/views/GisApp/export/toPdfSafeText/toPdfSafeText";

describe("toPdfSafeText", () => {
  it("rewrites the comparison signs a classified legend uses", () => {
    expect(toPdfSafeText("≥ 238")).toBe(">= 238");
    expect(toPdfSafeText("≤ 15")).toBe("<= 15");
  });

  it("rewrites a minus sign to a hyphen", () => {
    expect(toPdfSafeText("−12")).toBe("-12");
  });

  it("rewrites dashes and ellipses", () => {
    expect(toPdfSafeText("2025–2026")).toBe("2025-2026");
    expect(toPdfSafeText("a — b")).toBe("a - b");
    expect(toPdfSafeText("more…")).toBe("more...");
  });

  it("keeps text the font can already encode", () => {
    expect(toPdfSafeText("< 15")).toBe("< 15");
    expect(toPdfSafeText("Aj Jazirah, 238 deaths")).toBe(
      "Aj Jazirah, 238 deaths",
    );
  });

  it("keeps accented Latin letters, which WinAnsi encodes", () => {
    expect(toPdfSafeText("Gedaref · Al Qadarif")).toBe("Gedaref · Al Qadarif");
    expect(toPdfSafeText("Côte d’Ivoire")).toBe("Côte d’Ivoire");
  });

  it("replaces a character the font cannot encode at all", () => {
    expect(toPdfSafeText("السودان")).toBe("?".repeat(7));
  });

  it("passes an empty string through", () => {
    expect(toPdfSafeText("")).toBe("");
  });
});
