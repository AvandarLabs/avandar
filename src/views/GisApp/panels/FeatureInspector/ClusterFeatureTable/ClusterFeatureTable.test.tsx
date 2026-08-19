import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

// `MapInstanceHelpers` imports the real `maplibre-gl` package, whose own
// top-level code reaches for `window.URL.createObjectURL`, unavailable in
// jsdom. Nothing here constructs a real map, so a stub is enough.
vi.mock("maplibre-gl", () => {
  return {
    default: { Map: vi.fn(), NavigationControl: vi.fn() },
  };
});

const { ClusterFeatureTable } =
  await import("@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable");
const { CLUSTER_LEAVES_PAGE_SIZE } =
  await import("@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/useClusterLeavesPage/useClusterLeavesPage");

function _makeFeature(id: number, name: string): GeoJSON.Feature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: { name },
  };
}

function _makeDatasetColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

/** A layer whose popup shows every column of a query with these names. */
function _makeLayerWithColumns(columnNames: readonly string[]): MapLayer.T {
  const layer = MapLayer.makeEmpty("Cases");
  const queryColumns = columnNames.map((name) => {
    return QueryColumn.makeFromDatasetColumn(_makeDatasetColumn(name));
  });
  return {
    ...layer,
    source: { ...layer.source, queryColumns },
    popup: { columnIds: "all", action: undefined },
  };
}

function _makeMapRef(
  getClusterLeaves: (
    clusterId: number,
    limit: number,
    offset: number,
  ) => Promise<GeoJSON.Feature[]>,
): {
  mapRef: RefObject<MapLibreMap | undefined>;
  getClusterExpansionZoom: ReturnType<typeof vi.fn>;
  easeTo: ReturnType<typeof vi.fn>;
} {
  const getClusterExpansionZoom = vi.fn().mockResolvedValue(14);
  const easeTo = vi.fn();
  const source = { getClusterLeaves, getClusterExpansionZoom };
  const map = {
    getSource: vi.fn().mockReturnValue(source),
    easeTo,
  } as unknown as MapLibreMap;
  return { mapRef: { current: map }, getClusterExpansionZoom, easeTo };
}

const CLUSTER: ClusterSelection = {
  sourceId: "ava-map-source-clinics",
  clusterId: 42,
  pointCount: 120,
  coordinates: [-73.9, 40.7],
  layerId: "ava-map-layer-clinics",
};

describe("ClusterFeatureTable", () => {
  it("shows a loading state before the first page resolves", () => {
    const { mapRef } = _makeMapRef(() => {
      return new Promise(() => {
        return undefined;
      });
    });

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the cluster's leaves as table rows", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([
        _makeFeature(1, "Clinic A"),
        _makeFeature(2, "Clinic B"),
      ]);
    const { mapRef } = _makeMapRef(getClusterLeaves);

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );

    expect(await screen.findByText("Clinic A")).toBeInTheDocument();
    expect(screen.getByText("Clinic B")).toBeInTheDocument();
    expect(getClusterLeaves).toHaveBeenCalledWith(
      42,
      CLUSTER_LEAVES_PAGE_SIZE,
      0,
    );
  });

  it("shows an error message when the leaves request fails", async () => {
    const getClusterLeaves = vi.fn().mockRejectedValue(new Error("boom"));
    const { mapRef } = _makeMapRef(getClusterLeaves);

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );

    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
  });

  it("requests the next page at the correct offset when paginating", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1, "Clinic A")]);
    const { mapRef } = _makeMapRef(getClusterLeaves);

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );
    await screen.findByText("Clinic A");

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(getClusterLeaves).toHaveBeenLastCalledWith(
        42,
        CLUSTER_LEAVES_PAGE_SIZE,
        CLUSTER_LEAVES_PAGE_SIZE,
      );
    });
  });

  it("keeps the same columns across pages even when their leaves carry different property keys", async () => {
    // The layer's popup shows every query column ("all"), and its query has
    // two columns. Page 1's leaf only carries "name"; page 2's leaf only
    // carries "region" (as happens with sparse/optional fields). The header
    // must stay [name, region] on both pages: it comes from the layer's
    // query, not from whatever properties a given page's leaves happen to
    // carry.
    const layer = _makeLayerWithColumns(["name", "region"]);
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValueOnce([_makeFeature(1, "Clinic A")])
      .mockResolvedValueOnce([
        {
          type: "Feature" as const,
          id: 2,
          geometry: { type: "Point" as const, coordinates: [0, 0] },
          properties: { region: "North" },
        },
      ]);
    const { mapRef } = _makeMapRef(getClusterLeaves);

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={layer}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );
    await screen.findByText("Clinic A");

    const page1Headers = screen.getAllByRole("columnheader").map((header) => {
      return header.textContent;
    });
    expect(page1Headers).toEqual(["name", "region", ""]);

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => {
      expect(getClusterLeaves).toHaveBeenLastCalledWith(
        42,
        CLUSTER_LEAVES_PAGE_SIZE,
        CLUSTER_LEAVES_PAGE_SIZE,
      );
    });
    await screen.findByText("North");

    const page2Headers = screen.getAllByRole("columnheader").map((header) => {
      return header.textContent;
    });
    expect(page2Headers).toEqual(["name", "region", ""]);
  });

  it("opens the single-feature view for the row that was clicked", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([
        _makeFeature(1, "Clinic A"),
        _makeFeature(2, "Clinic B"),
      ]);
    const { mapRef } = _makeMapRef(getClusterLeaves);
    const onRowClick = vi.fn();

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={onRowClick}
      />,
    );
    await screen.findByText("Clinic B");

    fireEvent.click(screen.getByText("Clinic B"));

    expect(onRowClick).toHaveBeenCalledWith(_makeFeature(2, "Clinic B"));
  });

  it("opens the row's feature from its keyboard-reachable view button", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1, "Clinic A")]);
    const { mapRef } = _makeMapRef(getClusterLeaves);
    const onRowClick = vi.fn();

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={onRowClick}
      />,
    );
    const viewButton = await screen.findByRole("button", {
      name: /view details for clinic a/i,
    });

    viewButton.focus();
    fireEvent.click(viewButton);

    expect(onRowClick).toHaveBeenCalledWith(_makeFeature(1, "Clinic A"));
  });

  it("keeps each row a real table row rather than overriding it with role=button", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1, "Clinic A")]);
    const { mapRef } = _makeMapRef(getClusterLeaves);

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );
    await screen.findByText("Clinic A");

    const [row] = screen.getAllByRole("row").filter((candidate) => {
      return candidate.textContent?.includes("Clinic A");
    });

    expect(row).toBeDefined();
    expect(row).not.toHaveAttribute("role", "button");
    expect(screen.getAllByRole("cell")[0]).toHaveTextContent("Clinic A");
  });

  it("zooms to the cluster's expansion zoom instead of duplicating the easeTo call", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1, "Clinic A")]);
    const { mapRef, getClusterExpansionZoom, easeTo } =
      _makeMapRef(getClusterLeaves);

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );
    await screen.findByText("Clinic A");

    fireEvent.click(screen.getByRole("button", { name: /zoom to cluster/i }));

    await waitFor(() => {
      expect(getClusterExpansionZoom).toHaveBeenCalledWith(42);
    });
    expect(easeTo).toHaveBeenCalledWith({
      center: [-73.9, 40.7],
      zoom: 14,
    });
  });

  it("surfaces feedback when the zoom request fails, instead of failing silently", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1, "Clinic A")]);
    const { mapRef, getClusterExpansionZoom } = _makeMapRef(getClusterLeaves);
    getClusterExpansionZoom.mockRejectedValue(new Error("offline"));

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );
    await screen.findByText("Clinic A");

    fireEvent.click(screen.getByRole("button", { name: /zoom to cluster/i }));

    expect(
      await screen.findByText(/could not zoom to this cluster/i),
    ).toBeInTheDocument();
  });

  it("resolves to the newer cluster's leaves when an older request settles later", async () => {
    let resolveFirst: (leaves: GeoJSON.Feature[]) => void = () => {
      return;
    };
    const firstPromise = new Promise<GeoJSON.Feature[]>((resolve) => {
      resolveFirst = resolve;
    });
    const getClusterLeaves = vi
      .fn()
      .mockImplementationOnce(() => {
        return firstPromise;
      })
      .mockImplementationOnce(() => {
        return Promise.resolve([_makeFeature(9, "Second Cluster Clinic")]);
      });
    const { mapRef } = _makeMapRef(getClusterLeaves);

    const { rerender } = render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );

    const secondCluster: ClusterSelection = { ...CLUSTER, clusterId: 99 };
    rerender(
      <ClusterFeatureTable
        cluster={secondCluster}
        layer={undefined}
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Second Cluster Clinic"),
    ).toBeInTheDocument();

    // The stale first cluster's request resolving afterward must not
    // overwrite the already-rendered newer cluster's rows.
    resolveFirst([_makeFeature(1, "First Cluster Clinic")]);
    await new Promise((resolveTick) => {
      setTimeout(resolveTick, 0);
    });

    expect(screen.queryByText("First Cluster Clinic")).not.toBeInTheDocument();
    expect(screen.getByText("Second Cluster Clinic")).toBeInTheDocument();
  });
});
