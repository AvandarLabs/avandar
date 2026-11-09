import { Model } from "@avandar/models";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { ComponentProps } from "react";

vi.mock(
  "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable",
  () => {
    return {
      ClusterFeatureTable: ({
        hiddenColumnNames,
      }: {
        hiddenColumnNames?: readonly string[];
      }) => {
        return (
          <div
            data-testid="cluster-feature-table"
            data-hidden-columns={(hiddenColumnNames ?? []).join(",")}
          />
        );
      },
    };
  },
);

const { FeatureInspector } =
  await import("@/views/GisApp/panels/FeatureInspector/FeatureInspector");

const FEATURE: GeoJSON.Feature = {
  type: "Feature",
  properties: { case_id: "case-123" },
  geometry: { type: "Point", coordinates: [0, 0] },
};

const CLUSTER: ClusterSelection = {
  sourceId: "ava-map-source-clinics",
  clusterId: 42,
  pointCount: 120,
  coordinates: [-73.9, 40.7],
  layerId: "ava-map-layer-clinics",
};

function _makeLayerWithPopup(urlTemplate: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Cases"),
    popup: {
      columnIds: "all",
      action: { label: "Open case", urlTemplate },
    },
  };
}

function _renderInspector(
  props: Partial<ComponentProps<typeof FeatureInspector>> = {},
): void {
  render(
    <FeatureInspector
      opened
      onClose={() => {
        return;
      }}
      feature={FEATURE}
      cluster={undefined}
      layer={undefined}
      canvasRef={createRef<HTMLDivElement>()}
      mapRef={{ current: undefined }}
      onRowClick={vi.fn()}
      onBackToTable={vi.fn()}
      {...props}
    />,
  );
}

describe("FeatureInspector", () => {
  it("presents the feature in an in-flow region rather than a dialog", () => {
    _renderInspector();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Feature" })).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: /resize drawer/i }),
    ).toBeInTheDocument();
  });

  it("closes from the drawer header", () => {
    const onClose = vi.fn();
    _renderInspector({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders an allowed popup URL with feature values", () => {
    _renderInspector({
      layer: _makeLayerWithPopup("https://example.test/cases/{case_id}"),
    });

    expect(screen.getByRole("link", { name: "Open case" })).toHaveAttribute(
      "href",
      "https://example.test/cases/case-123",
    );
  });

  it("does not render a link for an unsafe popup URL", () => {
    _renderInspector({ layer: _makeLayerWithPopup("javascript:alert(1)") });

    expect(
      screen.queryByRole("link", { name: "Open case" }),
    ).not.toBeInTheDocument();
  });

  it("shows the cluster's feature table, titled with the cluster, when a cluster is selected and no feature was drilled into", () => {
    _renderInspector({ feature: undefined, cluster: CLUSTER });

    expect(screen.getByTestId("cluster-feature-table")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /features in cluster/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/case-123/)).not.toBeInTheDocument();
  });

  it("shows a back-to-table control for a feature drilled into from the cluster table, and invokes it", () => {
    const onBackToTable = vi.fn();
    _renderInspector({ feature: FEATURE, cluster: CLUSTER, onBackToTable });

    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    expect(onBackToTable).toHaveBeenCalledOnce();
    expect(
      screen.queryByTestId("cluster-feature-table"),
    ).not.toBeInTheDocument();
  });

  it("does not show a back-to-table control for a feature reached directly, unchanged from before clusters existed", () => {
    _renderInspector({ feature: FEATURE, cluster: undefined });

    expect(
      screen.queryByRole("button", { name: /back/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Feature" })).toBeInTheDocument();
  });

  it("offers a way back to the feature list it replaced, and invokes it", () => {
    const onBackToList = vi.fn();
    _renderInspector({ feature: FEATURE, cluster: undefined, onBackToList });

    fireEvent.click(
      screen.getByRole("button", { name: "Back to the feature list" }),
    );

    expect(onBackToList).toHaveBeenCalledOnce();
  });
});

function _makePlacesLayer(datasetId: Dataset.Id): MapLayer.T {
  const layer = MapLayer.makeEmpty("Exposure sites");
  const dataset = Model.make("Dataset", {
    id: datasetId,
    createdAt: "2026-11-09T00:00:00.000Z",
    updatedAt: "2026-11-09T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Exposure sites",
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
  return { ...layer, source: { ...layer.source, dataSource: dataset } };
}

describe("FeatureInspector place actions", () => {
  const placesDatasetId = uuid<Dataset.Id>();
  const placeActions = {
    placesDatasetIds: new Set([placesDatasetId]),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
  };
  const placeFeature: GeoJSON.Feature = {
    type: "Feature",
    properties: { place_id: "p1", name: "Clinic" },
    geometry: { type: "Point", coordinates: [-73.9885, 40.7603] },
  };

  it("offers Edit, Move, and Delete for a place from a places dataset", () => {
    _renderInspector({
      feature: placeFeature,
      layer: _makePlacesLayer(placesDatasetId),
      placeActions,
    });

    expect(screen.getByRole("button", { name: "Edit place" })).toBeVisible();
  });

  it("edits the place the feature's hidden place_id names", () => {
    _renderInspector({
      feature: placeFeature,
      layer: _makePlacesLayer(placesDatasetId),
      placeActions,
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit place" }));

    expect(placeActions.onEdit).toHaveBeenCalledWith({
      datasetId: placesDatasetId,
      placeId: "p1",
    });
  });

  it("hides the internal place_id from a place's fields", () => {
    _renderInspector({
      feature: placeFeature,
      layer: _makePlacesLayer(placesDatasetId),
      placeActions,
    });

    expect(screen.getByText("Clinic")).toBeInTheDocument();
    expect(screen.queryByText("place_id")).not.toBeInTheDocument();
    expect(screen.queryByText("p1")).not.toBeInTheDocument();
  });

  it("offers no place actions for a dataset that is not a places dataset", () => {
    _renderInspector({
      feature: placeFeature,
      layer: _makePlacesLayer(uuid<Dataset.Id>()),
      placeActions,
    });

    expect(
      screen.queryByRole("button", { name: "Edit place" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("place_id")).toBeInTheDocument();
  });

  it("hides the internal place_id from a places cluster's feature table", () => {
    _renderInspector({
      feature: undefined,
      cluster: CLUSTER,
      layer: _makePlacesLayer(placesDatasetId),
      placeActions,
    });

    expect(screen.getByTestId("cluster-feature-table")).toHaveAttribute(
      "data-hidden-columns",
      "place_id",
    );
  });

  it("hides nothing from the cluster table of a dataset that is not a places dataset", () => {
    _renderInspector({
      feature: undefined,
      cluster: CLUSTER,
      layer: _makePlacesLayer(uuid<Dataset.Id>()),
      placeActions,
    });

    expect(screen.getByTestId("cluster-feature-table")).toHaveAttribute(
      "data-hidden-columns",
      "",
    );
  });
});
