import { prop } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen, within } from "@/test-utils";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

vi.mock("@/views/GisApp/shell/MapChromePanel/MapChromePanel", () => {
  return {
    MapChromePanel: ({
      children,
      onToggleCollapsed,
      title,
    }: {
      children: ReactNode;
      onToggleCollapsed: () => void;
      title: string;
    }): ReactNode => {
      return (
        <section aria-label={title}>
          <button type="button" onClick={onToggleCollapsed}>
            Toggle legend
          </button>
          {children}
        </section>
      );
    },
  };
});

describe("MapLegend", () => {
  it("omits hidden layers and keeps the supplied layer order", () => {
    const firstLayer = {
      ...MapLayer.makeEmpty("First layer"),
      legend: {
        ...MapLayer.makeEmpty("First layer").legend,
        showNoData: false,
      },
    };
    const hiddenLayer = {
      ...MapLayer.makeEmpty("Hidden layer"),
      legend: {
        ...MapLayer.makeEmpty("Hidden layer").legend,
        position: "hidden" as const,
      },
    };
    const secondLayer = {
      ...MapLayer.makeEmpty("Second layer"),
      legend: {
        ...MapLayer.makeEmpty("Second layer").legend,
        title: "Second title",
        units: "people",
        showNoData: false,
      },
      symbology: {
        type: "proportionalSymbol" as const,
        value: uuid<QueryColumn.Id>(),
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#1563fe" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const layers = [
      firstLayer,
      hiddenLayer,
      secondLayer,
    ] satisfies readonly MapLayer.T[];

    render(
      <MapLegend
        layers={layers}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    const groups = screen.getByRole("region", { name: "Legend" });
    expect(
      within(groups).getAllByRole("heading").map(prop("textContent")),
    ).toEqual([firstLayer.legend.title, secondLayer.legend.title]);
    expect(within(groups).queryByText("Hidden layer")).not.toBeInTheDocument();
    expect(within(groups).getByText("people")).toBeInTheDocument();
    expect(within(groups).getByText("Sized by value")).toBeInTheDocument();
    expect(within(groups).queryByText("Not reported")).not.toBeInTheDocument();
  });

  it("renders a no-data key and forwards the collapse action", () => {
    const onToggleCollapsed = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    render(
      <MapLegend
        layers={[layer]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={onToggleCollapsed}
      />,
    );

    expect(screen.getByText("Not reported")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Toggle legend" }));
    expect(onToggleCollapsed).toHaveBeenCalledOnce();
  });

  it("falls back to the layer name when the legend title is empty", () => {
    const layer = MapLayer.makeEmpty("Cities");
    const layerWithEmptyLegendTitle = {
      ...layer,
      legend: { ...layer.legend, title: "" },
    } satisfies MapLayer.T;

    render(
      <MapLegend
        layers={[layerWithEmptyLegendTitle]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Cities" })).toBeInTheDocument();
  });

  it("renders persisted entries in order with counts and safe-state labels", () => {
    const layer = MapLayer.createArea("Districts");
    const classifiedLayer = {
      ...layer,
      legend: {
        ...layer.legend,
        units: "per 100,000",
        entries: [
          { type: "value" as const, color: "#fee", label: "< 10", count: 3 },
          { type: "noData" as const, color: "#ccc", label: "", count: 2 },
          {
            type: "suppressed" as const,
            color: "#888",
            label: "",
            count: 1,
          },
        ],
      },
    } satisfies MapLayer.T;

    render(
      <MapLegend
        layers={[classifiedLayer]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(
      items.map((item) => {
        return item.textContent;
      }),
    ).toEqual(["< 103", "Not reported2", "Suppressed1"]);
    expect(screen.getByText("per 100,000")).toBeInTheDocument();
    expect(screen.getByLabelText("Suppressed")).toBeInTheDocument();
  });

  it("renders classified color keys beside a proportional-symbol size graphic", () => {
    const layer = MapLayer.makeEmpty("Population");
    const sizedLayer = {
      ...layer,
      symbology: {
        type: "proportionalSymbol" as const,
        value: uuid<QueryColumn.Id>(),
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: {
          type: "categorical" as const,
          value: {
            type: "queryColumn" as const,
            column: uuid<QueryColumn.Id>(),
          },
          categories: [],
          other: { color: "#999", label: "Other" },
          noData: { color: "#ccc", label: "Not reported" },
        },
        stroke: { width: 1, color: "#fff" },
      },
      legend: {
        ...layer.legend,
        showNoData: false,
        sizeStops: [
          { value: 4, radiusPx: 4, label: "4" },
          { value: 100, radiusPx: 24, label: "100" },
        ],
        entries: [
          {
            type: "value" as const,
            color: "#123456",
            label: "Urban",
            count: 7,
          },
          {
            type: "value" as const,
            color: "#abcdef",
            label: "Rural",
            count: 3,
          },
        ],
      },
    } satisfies MapLayer.T;

    render(
      <MapLegend
        layers={[sizedLayer]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Symbol sizes from 4 to 100" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Urban")).toBeInTheDocument();
    expect(screen.getByText("Rural")).toBeInTheDocument();
  });

  it("renders a cluster as one color swatch without a count label", () => {
    const layer = MapLayer.makeEmpty("Incidents");
    const clusterLayer = {
      ...layer,
      symbology: {
        type: "cluster" as const,
        radiusPx: 50,
        color: { type: "single" as const, color: "#9b5802" },
        stroke: { width: 1, color: "#fff" },
      },
    } satisfies MapLayer.T;

    render(
      <MapLegend
        layers={[clusterLayer]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    const group = screen.getByRole("heading", {
      name: "Incidents",
    }).parentElement;

    expect(group?.querySelectorAll("li")).toHaveLength(1);
    expect(group?.textContent).toBe("IncidentsIncidents");
    expect(group?.textContent).not.toContain("50");
  });

  it("selects the qualitative heatmap legend without numeric stops", () => {
    const layer = MapLayer.makeEmpty("Density");
    const heatmapLayer = {
      ...layer,
      symbology: {
        type: "heatmap" as const,
        radiusPx: 30,
        weight: undefined,
        ramp: ["#ffd4af", "#9b5802", "#7e3500"],
      },
    } satisfies MapLayer.T;

    render(
      <MapLegend
        layers={[heatmapLayer]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Low to High" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Not reported")).not.toBeInTheDocument();
  });
});

function _visibleFillLayer(): MapLayer.T {
  return MapLayer.makeEmpty("Fill layer");
}

describe("MapLegend disputed row", () => {
  const DISPUTED_LABEL = "Disputed or undetermined boundary";

  it("shows the locked row when a disputed segment is drawn", () => {
    render(
      <MapLegend
        layers={[_visibleFillLayer()]}
        hasDrawnDisputedFeature
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByText(DISPUTED_LABEL)).toBeInTheDocument();
  });

  it("omits the locked row when no disputed segment is drawn", () => {
    render(
      <MapLegend
        layers={[_visibleFillLayer()]}
        hasDrawnDisputedFeature={false}
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.queryByText(DISPUTED_LABEL)).toBeNull();
  });

  it("offers no control to hide the locked row", () => {
    render(
      <MapLegend
        layers={[_visibleFillLayer()]}
        hasDrawnDisputedFeature
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );
    const row = screen.getByText(DISPUTED_LABEL).closest("div")!;

    expect(within(row).queryByRole("button")).toBeNull();
    expect(within(row).queryByRole("checkbox")).toBeNull();
  });

  it("shows the locked row even when every layer legend is hidden", () => {
    const layer = _visibleFillLayer();
    render(
      <MapLegend
        layers={[{ ...layer, legend: { ...layer.legend, position: "hidden" } }]}
        hasDrawnDisputedFeature
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByText(DISPUTED_LABEL)).toBeInTheDocument();
  });
});
