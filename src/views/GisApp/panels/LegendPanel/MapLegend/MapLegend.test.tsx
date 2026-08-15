import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
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
        ...MapLayer.makeEmpty("Second layer").symbology,
        type: "proportionalSymbol" as const,
        value: uuid<QueryColumn.Id>(),
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
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
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    const groups = screen.getByRole("region", { name: "Legend" });
    expect(
      within(groups)
        .getAllByRole("heading")
        .map((heading) => {
          return heading.textContent;
        }),
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
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Cities" })).toBeInTheDocument();
  });
});
