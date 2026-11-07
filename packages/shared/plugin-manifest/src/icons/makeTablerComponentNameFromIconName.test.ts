import { makeTablerComponentNameFromIconName } from "@plugin-manifest/icons/makeTablerComponentNameFromIconName.ts";
import { describe, expect, it } from "vitest";

describe("makeTablerComponentNameFromIconName", () => {
  it.each([
    ["chart-dots", "IconChartDots"],
    ["trending-up", "IconTrendingUp"],
    ["number-1", "IconNumber1"],
    ["puzzle", "IconPuzzle"],
  ])("maps %s to %s", (iconName, componentName) => {
    expect(makeTablerComponentNameFromIconName(iconName)).toBe(componentName);
  });
});
