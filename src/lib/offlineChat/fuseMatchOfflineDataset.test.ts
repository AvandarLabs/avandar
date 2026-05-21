import { describe, expect, it } from "vitest";
import { fuseMatchOfflineDatasetByName } from "./fuseMatchOfflineDataset";

const DATASETS = [
  { id: "id-deaths", name: "LONG_us_deaths.csv" },
  { id: "id-cases", name: "LONG_us_confirmed_cases.csv" },
] as const;

describe("fuseMatchOfflineDatasetByName", () => {
  it("matches a typo-heavy label to the closest dataset name", () => {
    const matched = fuseMatchOfflineDatasetByName({
      searchText: "long_us_deths",
      datasets: DATASETS,
    });
    expect(matched?.id).toBe("id-deaths");
  });

  it("returns undefined when nothing is close enough", () => {
    const matched = fuseMatchOfflineDatasetByName({
      searchText: "completely unrelated inventory table",
      datasets: DATASETS,
    });
    expect(matched).toBeUndefined();
  });
});
