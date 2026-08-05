import { describe, expect, it } from "vitest";
import { fuzzyMatchOfflineDatasetByName } from "./fuzzyMatchOfflineDatasetByName";

const DATASETS = [
  { id: "id-deaths", name: "LONG_us_deaths.csv" },
  { id: "id-cases", name: "LONG_us_confirmed_cases.csv" },
] as const;

describe("fuzzyMatchOfflineDatasetByName", () => {
  it("matches a typo-heavy label to the closest dataset name", () => {
    const matched = fuzzyMatchOfflineDatasetByName({
      searchText: "long_us_deths",
      datasets: DATASETS,
    });
    expect(matched?.id).toBe("id-deaths");
  });

  it("returns undefined when nothing is close enough", () => {
    const matched = fuzzyMatchOfflineDatasetByName({
      searchText: "completely unrelated inventory table",
      datasets: DATASETS,
    });
    expect(matched).toBeUndefined();
  });
});
