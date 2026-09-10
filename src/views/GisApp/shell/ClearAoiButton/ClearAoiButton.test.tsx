import { describe, expect, it, vi } from "vitest";
/**
 * Map-level control that unsets the area-of-interest polygon.
 */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { fireEvent, render, screen } from "@/test-utils";
import { ClearAoiButton } from "@/views/GisApp/shell/ClearAoiButton/ClearAoiButton";

const UNIT_SQUARE: AvaMapConfig.AoiPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

describe("ClearAoiButton", () => {
  it("hides when no area filter is set", () => {
    render(<ClearAoiButton aoi={undefined} updateConfig={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Clear area filter" }),
    ).not.toBeInTheDocument();
  });

  it("shows Clear area filter when an AOI is set and clicking unsets it", () => {
    let config = AvaMapConfig.withAoi({
      config: AvaMapConfig.makeEmpty(),
      aoi: UNIT_SQUARE,
    });
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );

    render(<ClearAoiButton aoi={config.aoi} updateConfig={updateConfig} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear area filter" }));

    expect(config.aoi).toBeUndefined();
  });
});
