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
    drops: [],
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

  it("prioritizes suppressed areas over no-data areas", () => {
    render(
      <LayerStatusBadge
        viewState={_makeViewState({
          suppressedCount: 2,
          noDataCount: 4,
        })}
      />,
    );

    expect(screen.getByText("2 suppressed")).toBeInTheDocument();
    expect(screen.queryByText("4 no data")).not.toBeInTheDocument();
  });

  it("reports no-data areas when none are suppressed", () => {
    render(
      <LayerStatusBadge
        viewState={_makeViewState({ noDataCount: 4, suppressedCount: 0 })}
      />,
    );

    expect(screen.getByText("4 no data")).toBeInTheDocument();
  });
});
