import { describe, expect, it } from "vitest";
import { getExportFilename } from "@/views/GisApp/export/getExportFilename/getExportFilename";

describe("getExportFilename", () => {
  it("slugifies the title and appends the produced date", () => {
    expect(
      getExportFilename({
        title: "Cholera response, North Kivu",
        producedAt: new Date("2026-08-18T09:00:00Z"),
      }),
    ).toBe("cholera-response-north-kivu-2026-08-18.pdf");
  });

  it("falls back to a bare map name when the title is only punctuation", () => {
    expect(
      getExportFilename({
        title: "!!! --- ???",
        producedAt: new Date("2026-08-18T09:00:00Z"),
      }),
    ).toBe("map-2026-08-18.pdf");
  });

  it("truncates a very long title to 60 characters before the date", () => {
    const title =
      "Cholera response across every health zone in North Kivu " +
      "and South Kivu provinces during the wet season outbreak";

    const filename = getExportFilename({
      title,
      producedAt: new Date("2026-08-18T09:00:00Z"),
    });

    expect(filename).toMatch(/^[a-z0-9-]+-2026-08-18\.pdf$/);
    const slug = filename.replace(/-2026-08-18\.pdf$/, "");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.length).toBeGreaterThan(0);
  });

  it("never lets path separators or .. survive into the filename", () => {
    const filename = getExportFilename({
      title: "../../etc/passwd",
      producedAt: new Date("2026-08-18T09:00:00Z"),
    });

    expect(filename).not.toContain("/");
    expect(filename).not.toContain("\\");
    expect(filename).not.toContain("..");
    expect(filename).toBe("etc-passwd-2026-08-18.pdf");
  });

  it("always ends with .pdf and one date segment", () => {
    expect(
      getExportFilename({
        title: "Weekly sitrep",
        producedAt: new Date("2026-01-05T00:00:00Z"),
      }),
    ).toBe("weekly-sitrep-2026-01-05.pdf");
  });
});
