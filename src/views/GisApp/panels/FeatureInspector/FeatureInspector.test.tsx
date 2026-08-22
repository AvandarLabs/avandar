import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { ComponentProps } from "react";

import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";

vi.mock(
  "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable",
  () => {
    return {
      ClusterFeatureTable: () => {
        return <div data-testid="cluster-feature-table" />;
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
});
