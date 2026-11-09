import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen, within } from "@/test-utils";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { FeatureListQueryState } from "@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery";

const { useFeatureListQueryMock, downloadRowsAsCsvMock } = vi.hoisted(() => {
  return {
    useFeatureListQueryMock: vi.fn(),
    downloadRowsAsCsvMock: vi.fn(),
  };
});

vi.mock("@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery", () => {
  return { useFeatureListQuery: useFeatureListQueryMock };
});

vi.mock("@/views/DataExplorerApp/downloadRowsAsCsv", () => {
  return { downloadRowsAsCsv: downloadRowsAsCsvMock };
});

const { FeatureListDrawer } =
  await import("@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer");

const LIST: MapLayerFeatureList = {
  columns: [
    { key: "loc_name", label: "loc_name", kind: "source" },
    {
      key: "__avandar_distance",
      label: "Distance to nearest Sites",
      kind: "distance",
    },
  ],
  rows: [
    {
      loc_name: "Near school",
      __avandar_distance: 0.0935,
      __avandar_longitude: -73.99,
      __avandar_latitude: 40.73,
    },
    {
      loc_name: "A far school",
      __avandar_distance: 0.4,
      __avandar_longitude: -73.98,
      __avandar_latitude: 40.74,
    },
  ],
  totalCount: 2,
  distanceUnit: "mi",
};

function _mockState(state: Partial<FeatureListQueryState>): void {
  useFeatureListQueryMock.mockReturnValue({
    access: "rows",
    list: undefined,
    count: undefined,
    isLoading: false,
    error: undefined,
    ...state,
  });
}

function _renderDrawer(
  onRowClick = vi.fn(),
  options: { layer: MapLayer.T | undefined } = {
    layer: MapLayer.makeEmpty("Schools"),
  },
): void {
  render(
    <FeatureListDrawer
      layer={options.layer}
      config={AvaMapConfig.makeEmpty()}
      workspaceId={uuid<Workspace.Id>()}
      canvasRef={createRef<HTMLDivElement>()}
      onClose={vi.fn()}
      onRowClick={onRowClick}
    />,
  );
}

function _getFirstRowText(): string {
  return screen.getAllByRole("row", { hidden: true })[1]?.textContent ?? "";
}

describe("FeatureListDrawer", () => {
  beforeEach(() => {
    useFeatureListQueryMock.mockReset();
    downloadRowsAsCsvMock.mockReset();
  });

  it("shows the count and the distance in the buffer's unit, nearest first", () => {
    _mockState({ list: LIST });
    _renderDrawer();

    expect(screen.getByText("2 features")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Distance to nearest Sites" }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(_getFirstRowText()).toContain("Near school");
    expect(_getFirstRowText()).toContain("0.09 mi");
  });

  it("sorts by a column when its header is pressed", () => {
    _mockState({ list: LIST });
    _renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "loc_name" }));

    expect(_getFirstRowText()).toContain("A far school");
  });

  it("explains why rows are hidden for approximate locations", () => {
    _mockState({ access: "countOnly", count: 12 });
    _renderDrawer();

    expect(screen.getByText("12 features")).toBeInTheDocument();
    expect(
      screen.getByText(/This layer shows approximate locations/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("button", { name: "Download CSV" })).toBeNull();
  });

  it("never shows an exact count below five for approximate locations", () => {
    _mockState({ access: "countOnly", count: 3 });
    _renderDrawer();

    expect(screen.getByText("Fewer than 5 features")).toBeInTheDocument();
    expect(screen.queryByText(/3 features/)).toBeNull();
  });

  it("shows an exact count of five for approximate locations", () => {
    _mockState({ access: "countOnly", count: 5 });
    _renderDrawer();

    expect(screen.getByText("5 features")).toBeInTheDocument();
  });

  it("explains when a layer has no feature list", () => {
    _mockState({ access: "unavailable" });
    _renderDrawer();

    expect(
      screen.getByText("This layer's features cannot be listed."),
    ).toBeInTheDocument();
  });

  it("renders nothing when its layer is missing", () => {
    _mockState({ access: "unavailable" });
    _renderDrawer(vi.fn(), { layer: undefined });

    expect(screen.queryByText(/Feature list/)).toBeNull();
    expect(screen.queryByRole("region", { hidden: true })).toBeNull();
  });

  it("downloads the listed rows as CSV", () => {
    _mockState({ list: LIST });
    _renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));

    expect(downloadRowsAsCsvMock).toHaveBeenCalledWith([
      { loc_name: "Near school", "Distance to nearest Sites (mi)": 0.09 },
      { loc_name: "A far school", "Distance to nearest Sites (mi)": 0.4 },
    ]);
  });

  it("shows a feature on the map when its row is pressed", () => {
    _mockState({ list: LIST });
    const onRowClick = vi.fn();
    _renderDrawer(onRowClick);

    fireEvent.click(
      within(screen.getAllByRole("row", { hidden: true })[1]!).getByRole(
        "button",
        { name: "Show Near school on the map" },
      ),
    );

    expect(onRowClick).toHaveBeenCalledWith(LIST.rows[0]);
  });
});
