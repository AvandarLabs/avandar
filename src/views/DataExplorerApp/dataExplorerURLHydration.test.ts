import { describe, expect, it } from "vitest";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import {
  shouldDeferURLHydrationForStructuredLoading,
  urlSearchHasHydrateableExplorerKeys,
} from "@/views/DataExplorerApp/dataExplorerURLHydration";
import type { ParsedURLState } from "@/views/DataExplorerApp/DataExplorerURLState";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

const _minimalBarViz: VizConfig = {
  vizType: "bar",
  xAxisKey: "a",
  yAxisKey: "b",
  withLegend: false,
};

function _parsed(overrides: Partial<ParsedURLState> = {}): ParsedURLState {
  return { ...overrides };
}

describe("urlSearchHasHydrateableExplorerKeys", () => {
  it("returns false for an empty parsed state", () => {
    expect(urlSearchHasHydrateableExplorerKeys(_parsed())).toBe(false);
  });

  it("returns true when dsId is set", () => {
    expect(urlSearchHasHydrateableExplorerKeys(_parsed({ dsId: "a" }))).toBe(
      true,
    );
  });

  it("returns true when rawSQL is set", () => {
    expect(urlSearchHasHydrateableExplorerKeys(_parsed({ rawSQL: "x" }))).toBe(
      true,
    );
  });

  it("returns true when vizConfig is set", () => {
    expect(
      urlSearchHasHydrateableExplorerKeys(
        _parsed({ vizConfig: _minimalBarViz }),
      ),
    ).toBe(true);
  });

  it("returns false when only openDataset is set (not a hydrate trigger)", () => {
    const openDataset = {
      datasetId: "d",
      name: "n",
      virtualDatasetId: "v",
    } as OpenDatasetInfo;
    expect(
      urlSearchHasHydrateableExplorerKeys(_parsed({ openDataset })),
    ).toBe(false);
  });
});

describe("shouldDeferURLHydrationForStructuredLoading", () => {
  const DS = { id: "ds-1" };

  it("does not defer when rawSQL is set even if dsId is unresolved", () => {
    expect(
      shouldDeferURLHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "missing", rawSQL: "SELECT 1" }),
        restoredDataSource: undefined,
        needsColumns: true,
        datasetColumns: undefined,
        entityFieldConfigs: undefined,
      }),
    ).toBe(false);
  });

  it("defers when structured dsId has no restored data source yet", () => {
    expect(
      shouldDeferURLHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x" }),
        restoredDataSource: undefined,
        needsColumns: false,
        datasetColumns: undefined,
        entityFieldConfigs: undefined,
      }),
    ).toBe(true);
  });

  it("does not defer once restored data source exists", () => {
    expect(
      shouldDeferURLHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x" }),
        restoredDataSource: DS,
        needsColumns: false,
        datasetColumns: undefined,
        entityFieldConfigs: undefined,
      }),
    ).toBe(false);
  });

  it("defers when columns are needed but neither column list is loaded", () => {
    expect(
      shouldDeferURLHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x", colNames: ["a"] }),
        restoredDataSource: DS,
        needsColumns: true,
        datasetColumns: undefined,
        entityFieldConfigs: undefined,
      }),
    ).toBe(true);
  });

  it("does not defer when dataset columns have loaded", () => {
    expect(
      shouldDeferURLHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x", colNames: ["a"] }),
        restoredDataSource: DS,
        needsColumns: true,
        datasetColumns: [{ id: "c1" }],
        entityFieldConfigs: undefined,
      }),
    ).toBe(false);
  });

  it("does not defer when entity field configs have loaded", () => {
    expect(
      shouldDeferURLHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x", colNames: ["a"] }),
        restoredDataSource: DS,
        needsColumns: true,
        datasetColumns: undefined,
        entityFieldConfigs: [{ id: "f1" }],
      }),
    ).toBe(false);
  });
});
