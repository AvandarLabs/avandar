import { expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { render, screen } from "@/test-utils";
import { LayerInspector } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

vi.mock("@/views/GisApp/shell/MapChromePanel/MapChromePanel", () => {
  return {
    MapChromePanel: ({ children }: { children: ReactNode }) => {
      return <section>{children}</section>;
    },
  };
});

vi.mock(
  "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody",
  () => {
    return {
      LayerInspectorBody: ({
        inspectorView,
      }: {
        inspectorView: { type: string };
      }) => {
        return <div>{inspectorView.type}</div>;
      },
    };
  },
);

it("renders the coordinate validation view supplied by the app", () => {
  render(
    <LayerInspector
      layer={{
        ...MapLayer.makeEmpty("Layer"),
        geoBinding: { type: "latLngColumns" } as MapLayer.GeoBinding,
      }}
      viewState={undefined}
      inspectorView={{ type: "validationReport" }}
      onInspectorViewChange={vi.fn()}
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
      onLayerChange={vi.fn()}
    />,
  );

  expect(screen.getByText("validationReport")).toBeInTheDocument();
});
