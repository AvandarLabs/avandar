import { toTablerIconComponentName } from "@plugin-manifest/icons/toTablerIconComponentName.ts";
import { describe, expect, it } from "vitest";

describe("toTablerIconComponentName", () => {
  it.each([
    ["chart-dots", "IconChartDots"],
    ["trending-up", "IconTrendingUp"],
    ["number-1", "IconNumber1"],
    ["puzzle", "IconPuzzle"],
  ])("maps %s to %s", (iconName, componentName) => {
    expect(toTablerIconComponentName(iconName)).toBe(componentName);
  });
});
