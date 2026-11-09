import { describe, expect, it } from "vitest";
import { replaceGadgetNames } from "./replaceGadgetNames";

describe("replaceGadgetNames", () => {
  it("replaces whole words only, ignoring case", () => {
    expect(
      replaceGadgetNames("cases and Cases, not showcases", [
        { name: "Cases", replacement: "a dataset" },
      ]),
    ).toBe("a dataset and a dataset, not showcases");
  });

  it("replaces the longest name first", () => {
    expect(
      replaceGadgetNames('"Jane Doe visits" and Jane Doe', [
        { name: "Jane Doe", replacement: "a dashboard" },
        { name: "Jane Doe visits", replacement: "a chart" },
      ]),
    ).toBe('"a chart" and a dashboard');
  });

  it("never replaces inside a replacement", () => {
    expect(
      replaceGadgetNames("Map", [
        { name: "Map", replacement: "a map" },
        { name: "a", replacement: "x" },
      ]),
    ).toBe("a map");
  });

  it("reads names with regex characters literally and skips blank ones", () => {
    expect(
      replaceGadgetNames("Deaths (2022) and (.*)", [
        { name: "Deaths (2022)", replacement: "a chart" },
        { name: "  ", replacement: "x" },
      ]),
    ).toBe("a chart and (.*)");
  });

  it("returns the text as is with no names", () => {
    expect(replaceGadgetNames("hello", [])).toBe("hello");
  });
});
