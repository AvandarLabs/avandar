/**
 * Tests for the per-type gadget summary hooks. Every client hook is mocked,
 * so each case controls exactly what the lookups return.
 */
import { describe, expect, it } from "vitest";
import { useGadgetSummariesTestFixtures } from "./useGadgetSummariesTestFixtures";

const {
  useDatasetSummary,
  useMapSummary,
  AppLinks,
  mocks,
  WORKSPACE_ID,
  OTHER_WORKSPACE_ID,
  DATASET_ID,
  MAP_ID,
  UPDATED_AT,
  UPDATED_LABEL,
  _ref,
  _renderSummary,
  _factPairs,
} = useGadgetSummariesTestFixtures;

describe("useDatasetSummary", () => {
  it("summarizes a dataset with its source and column count", () => {
    mocks.useDatasetById.mockReturnValue([
      {
        id: DATASET_ID,
        workspaceId: WORKSPACE_ID,
        name: "Borough boundaries",
        sourceType: "csv_file",
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    mocks.useDatasetColumnCount.mockReturnValue([4, false]);
    const summary = _renderSummary(
      useDatasetSummary,
      _ref("dataset", DATASET_ID),
    );
    const appLink = AppLinks.dataManagerDatasetView({
      workspaceSlug: "nyc-doh",
      datasetId: DATASET_ID,
      datasetName: "Borough boundaries",
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Borough boundaries",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Source", "CSV file"],
      ["Columns", "4"],
      ["Updated", UPDATED_LABEL],
    ]);
    expect(mocks.useDatasetColumnCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dataset_id: { eq: DATASET_ID } } }),
    );
  });

  it("is unavailable for a dataset in another workspace", () => {
    mocks.useDatasetById.mockReturnValue([
      {
        id: DATASET_ID,
        workspaceId: OTHER_WORKSPACE_ID,
        name: "Borough boundaries",
        sourceType: "csv_file",
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    mocks.useDatasetColumnCount.mockReturnValue([4, false]);
    expect(
      _renderSummary(useDatasetSummary, _ref("dataset", DATASET_ID)),
    ).toEqual({ status: "unavailable" });
  });

  it("is unavailable when no dataset row comes back", () => {
    mocks.useDatasetColumnCount.mockReturnValue([0, false]);
    expect(
      _renderSummary(useDatasetSummary, _ref("dataset", DATASET_ID)),
    ).toEqual({ status: "unavailable" });
  });

  it("skips the column count when facts are not needed", () => {
    mocks.useDatasetById.mockReturnValue([
      {
        id: DATASET_ID,
        workspaceId: WORKSPACE_ID,
        name: "Borough boundaries",
        sourceType: "csv_file",
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    const summary = _renderSummary(
      useDatasetSummary,
      _ref("dataset", DATASET_ID),
      { withFacts: false },
    );
    expect(summary).toMatchObject({ status: "available", facts: [] });
    expect(mocks.useDatasetColumnCount).toHaveBeenCalledWith(
      expect.objectContaining({ useQueryOptions: { enabled: false } }),
    );
  });

  it("is loading while the column count is fetched", () => {
    mocks.useDatasetById.mockReturnValue([
      {
        id: DATASET_ID,
        workspaceId: WORKSPACE_ID,
        name: "Borough boundaries",
        sourceType: "csv_file",
      },
      false,
    ]);
    mocks.useDatasetColumnCount.mockReturnValue([undefined, true]);
    expect(
      _renderSummary(useDatasetSummary, _ref("dataset", DATASET_ID)),
    ).toEqual({ status: "loading" });
  });
});

describe("useMapSummary", () => {
  it("summarizes a map with its layer count", () => {
    mocks.useMapById.mockReturnValue([
      {
        id: MAP_ID,
        workspaceId: WORKSPACE_ID,
        name: "Exposure sites",
        updatedAt: UPDATED_AT,
        config: { layers: [{}, {}, {}] },
      },
      false,
    ]);
    const summary = _renderSummary(useMapSummary, _ref("map", MAP_ID));
    const appLink = AppLinks.mapEditor({
      workspaceSlug: "nyc-doh",
      mapId: MAP_ID,
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Exposure sites",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Layers", "3"],
      ["Updated", UPDATED_LABEL],
    ]);
  });
});
