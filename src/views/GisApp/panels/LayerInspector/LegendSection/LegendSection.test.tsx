import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import type { ReactNode } from "react";

vi.mock(
  "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection",
  () => {
    return {
      InspectorSection: ({
        children,
        note,
        title,
      }: {
        children: ReactNode;
        note?: string;
        title: ReactNode;
      }): ReactNode => {
        return (
          <section>
            <h2>{title}</h2>
            <span>{note}</span>
            {children}
          </section>
        );
      },
    };
  },
);

function _applyLatestUpdate(
  onLayerChange: ReturnType<typeof vi.fn>,
  layer: MapLayer.T,
): MapLayer.T {
  const latestCall = onLayerChange.mock.lastCall;
  if (!latestCall) {
    throw new Error("Expected a layer update");
  }
  return latestCall[0](layer);
}

describe("LegendSection", () => {
  it("writes title, units, and no-data settings", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    render(<LegendSection layer={layer} onLayerChange={onLayerChange} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Population" },
    });
    let updatedLayer = _applyLatestUpdate(onLayerChange, layer);
    expect(updatedLayer.legend.title).toBe("Population");

    fireEvent.change(screen.getByLabelText("Units"), {
      target: { value: "people" },
    });
    updatedLayer = _applyLatestUpdate(onLayerChange, updatedLayer);
    expect(updatedLayer.legend.units).toBe("people");

    fireEvent.click(
      screen.getByRole("switch", { name: /show a not reported entry/i }),
    );
    updatedLayer = _applyLatestUpdate(onLayerChange, updatedLayer);
    expect(updatedLayer.legend.showNoData).toBe(false);
  });

  it("writes the selected position and shows its translated note", () => {
    const onLayerChange = vi.fn();
    const layer = MapLayer.makeEmpty("Cities");

    render(<LegendSection layer={layer} onLayerChange={onLayerChange} />);

    expect(screen.getByRole("combobox", { name: "Position" })).toHaveValue(
      "Bottom right",
    );
    pickMantineSelectOption("Position", "Top right");

    const updatedLayer = _applyLatestUpdate(onLayerChange, layer);
    expect(updatedLayer.legend.position).toBe("topRight");
  });
});
