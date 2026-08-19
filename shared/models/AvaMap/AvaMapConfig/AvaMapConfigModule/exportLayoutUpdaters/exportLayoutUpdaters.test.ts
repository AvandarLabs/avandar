import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { describe, expect, it } from "vitest";

describe("exportLayoutUpdaters", () => {
  it("defaults a new map to A4 landscape with no disclaimer", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(config.exportLayout.paper).toBe("a4");
    expect(config.exportLayout.orientation).toBe("landscape");
    expect(config.exportLayout.disclaimer).toBeUndefined();
  });

  it("stores an edited layout", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        paper: "letter",
        title: { isVisible: true, text: "Cholera response" },
      },
    });

    expect(config.exportLayout.paper).toBe("letter");
    expect(config.exportLayout.title.text).toBe("Cholera response");
  });

  it("returns the same config when nothing changed", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(
      AvaMapConfig.withExportLayout({
        config,
        exportLayout: config.exportLayout,
      }),
    ).toBe(config);
  });

  it("stores a cleared disclaimer as unset rather than blank", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        disclaimer: "   ",
      },
    });

    expect(config.exportLayout.disclaimer).toBeUndefined();
  });

  it("stores a padded disclaimer trimmed rather than verbatim", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        disclaimer: "  Data unverified  ",
      },
    });

    expect(config.exportLayout.disclaimer).toBe("Data unverified");
  });
});
