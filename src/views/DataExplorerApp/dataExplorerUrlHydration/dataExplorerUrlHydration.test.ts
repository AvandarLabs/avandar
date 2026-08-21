import { describe, expect, it } from "vitest";
import {
  shouldDeferUrlHydrationForStructuredLoading,
  urlSearchHasHydrateableExplorerKeys,
} from "@/views/DataExplorerApp/dataExplorerUrlHydration/dataExplorerUrlHydration";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { ParsedUrlState } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

const _minimalBarViz: VizConfig = {
  vizType: "bar",
  xAxisKey: "a",
  series: [{ renderAs: "bar", key: "b" }],
  layout: "group",
  withLegend: false,
};

function _parsed(overrides: Partial<ParsedUrlState> = {}): ParsedUrlState {
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

  it("returns true when rawSql is set", () => {
    expect(urlSearchHasHydrateableExplorerKeys(_parsed({ rawSql: "x" }))).toBe(
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
      sourceType: "virtual",
      virtualDatasetId: "v",
    } as OpenDatasetInfo;
    expect(urlSearchHasHydrateableExplorerKeys(_parsed({ openDataset }))).toBe(
      false,
    );
  });
});

describe("shouldDeferUrlHydrationForStructuredLoading", () => {
  const DS = { id: "ds-1" };

  it("defers when rawSql is set until workspace SQL mapping metadata loads", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ rawSql: "SELECT 1" }),
        restoredDataSource: undefined,
        needsColumns: false,
        datasetColumns: undefined,
        conceptAttributes: undefined,
        sqlMappingMetadataLoaded: false,
      }),
    ).toBe(true);
  });

  it("does not defer when rawSql is set and SQL mapping metadata is loaded", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "missing", rawSql: "SELECT 1" }),
        restoredDataSource: undefined,
        needsColumns: true,
        datasetColumns: undefined,
        conceptAttributes: undefined,
        sqlMappingMetadataLoaded: true,
      }),
    ).toBe(false);
  });

  it("defers when structured dsId has no restored data source yet", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x" }),
        restoredDataSource: undefined,
        needsColumns: false,
        datasetColumns: undefined,
        conceptAttributes: undefined,
        sqlMappingMetadataLoaded: true,
      }),
    ).toBe(true);
  });

  it("does not defer once restored data source exists", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x" }),
        restoredDataSource: DS,
        needsColumns: false,
        datasetColumns: undefined,
        conceptAttributes: undefined,
        sqlMappingMetadataLoaded: true,
      }),
    ).toBe(false);
  });

  it("defers when columns are needed but neither column list is loaded", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x", colNames: ["a"] }),
        restoredDataSource: DS,
        needsColumns: true,
        datasetColumns: undefined,
        conceptAttributes: undefined,
        sqlMappingMetadataLoaded: true,
      }),
    ).toBe(true);
  });

  it("does not defer when dataset columns have loaded", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x", colNames: ["a"] }),
        restoredDataSource: DS,
        needsColumns: true,
        datasetColumns: [{ id: "c1" }],
        conceptAttributes: undefined,
        sqlMappingMetadataLoaded: true,
      }),
    ).toBe(false);
  });

  it("does not defer when concept attributes have loaded", () => {
    expect(
      shouldDeferUrlHydrationForStructuredLoading({
        urlState: _parsed({ dsId: "x", colNames: ["a"] }),
        restoredDataSource: DS,
        needsColumns: true,
        datasetColumns: undefined,
        conceptAttributes: [{ id: "f1" }],
        sqlMappingMetadataLoaded: true,
      }),
    ).toBe(false);
  });
});
