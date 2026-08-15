import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { LayerStatusBadge } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

function _makeViewState(
  overrides: Partial<MapLayerViewState>,
): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: 3,
    droppedRowCount: 0,
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe("LayerStatusBadge", () => {
  it.each([
    ["unbound", "Needs geometry"],
    ["loading", "Loading"],
    ["error", "Could not load"],
    ["empty", "No rows"],
    ["ready", "3 points"],
  ] as const)("shows the %s layer status", (status, label) => {
    render(<LayerStatusBadge viewState={_makeViewState({ status })} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("reports unmapped rows instead of the ready point count", () => {
    render(
      <LayerStatusBadge
        viewState={_makeViewState({
          droppedRowCount: 2,
          featureCount: 3,
        })}
      />,
    );

    expect(screen.getByText("2 rows unmapped")).toBeInTheDocument();
    expect(screen.queryByText("3 points")).not.toBeInTheDocument();
  });
});
