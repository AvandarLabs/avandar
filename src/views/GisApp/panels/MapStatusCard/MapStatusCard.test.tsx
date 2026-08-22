import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

import { describe, expect, it, vi } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import { MapStatusCard } from "@/views/GisApp/panels/MapStatusCard/MapStatusCard";

function _makeLayer(): MapLayer.T {
  return MapLayer.makeEmpty("Admissions");
}

function _makeViewState(
  overrides: Partial<MapLayerViewState>,
): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: 3,
    drops: [],
    droppedRowCount: 0,
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe("MapStatusCard", () => {
  it("does not render when the selected layer has nothing to explain", () => {
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({ status: "ready" })}
        onSeeWhy={vi.fn()}
        onReviewFilter={vi.fn()}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("offers retry and details for a failed selected layer", () => {
    const onRetry = vi.fn();
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({
          status: "error",
          error: new Error("Dataset is offline"),
          onRetry,
        })}
        onSeeWhy={vi.fn()}
        onReviewFilter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText("Dataset is offline")).toBeInTheDocument();
  });

  it("translates aggregate-only geometry errors at the display boundary", () => {
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({
          status: "error",
          error: new SensitivityViolationError("aggregateOnly"),
        })}
        onSeeWhy={vi.fn()}
        onReviewFilter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show details" }));

    expect(
      screen.getByText(
        "Aggregate-only layers cannot be drawn from individual coordinates.",
      ),
    ).toBeInTheDocument();
  });

  it("offers filter review for an empty filtered layer", () => {
    const onReviewFilter = vi.fn();
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({ status: "empty", filterCount: 2 })}
        onSeeWhy={vi.fn()}
        onReviewFilter={onReviewFilter}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review filter" }));

    expect(onReviewFilter).toHaveBeenCalledOnce();
    expect(
      screen.getByText(
        "2 filters are active on this layer. They may be excluding everything.",
      ),
    ).toBeInTheDocument();
  });

  it("explains why rows were dropped from a partial mapping", () => {
    const onSeeWhy = vi.fn();
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({
          status: "ready",
          featureCount: 3,
          droppedRowCount: 2,
          largestDropReason: "nullIsland",
        })}
        onSeeWhy={onSeeWhy}
        onReviewFilter={vi.fn()}
      />,
    );

    expect(
      screen.getByText("2 of 5 rows could not be mapped"),
    ).toBeInTheDocument();
    expect(screen.getByText("Some coordinates are 0, 0.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See why" }));
    expect(onSeeWhy).toHaveBeenCalledOnce();
  });

  it("explains suppressed areas without exposing exact counts", () => {
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({ suppressedCount: 2 })}
        onSeeWhy={vi.fn()}
        onReviewFilter={vi.fn()}
      />,
    );

    expect(screen.getByText("2 areas are suppressed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Their contributor counts stay hidden because they are below the layer's minimum.",
      ),
    ).toBeInTheDocument();
  });

  it("explains that unavailable Spatial does not discard configuration", () => {
    render(
      <MapStatusCard
        layer={_makeLayer()}
        viewState={_makeViewState({
          status: "error",
          error: new Error(
            "DuckDB Spatial is unavailable for this geometry layer",
          ),
        })}
        onSeeWhy={vi.fn()}
        onReviewFilter={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "The layer configuration is saved. Retry after connectivity or the Spatial extension becomes available.",
      ),
    ).toBeInTheDocument();
  });
});
