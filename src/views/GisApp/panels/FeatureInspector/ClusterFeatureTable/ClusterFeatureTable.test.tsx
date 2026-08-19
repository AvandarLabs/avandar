import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
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
        mapRef={mapRef}
        onRowClick={onRowClick}
      />,
    );
    await screen.findByText("Clinic B");

    fireEvent.click(screen.getByText("Clinic B"));

    expect(onRowClick).toHaveBeenCalledWith(_makeFeature(2, "Clinic B"));
  });

  it("opens the row's feature on Enter for keyboard users", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1, "Clinic A")]);
    const { mapRef } = _makeMapRef(getClusterLeaves);
    const onRowClick = vi.fn();

    render(
      <ClusterFeatureTable
        cluster={CLUSTER}
        mapRef={mapRef}
        onRowClick={onRowClick}
      />,
    );
    const row = await screen.findByRole("button", { name: /Clinic A/i });

    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });

    expect(onRowClick).toHaveBeenCalledWith(_makeFeature(1, "Clinic A"));
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
        mapRef={mapRef}
        onRowClick={vi.fn()}
      />,
    );

    const secondCluster: ClusterSelection = { ...CLUSTER, clusterId: 99 };
    rerender(
      <ClusterFeatureTable
        cluster={secondCluster}
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
