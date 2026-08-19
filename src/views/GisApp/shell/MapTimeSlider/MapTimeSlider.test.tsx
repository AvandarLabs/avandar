/**
 * Map clock range slider, play, and reduced-motion behavior.
 */
import { useReducedMotion } from "@mantine/hooks";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import type { AvaMapConfig as AvaMapConfigT } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock("@mantine/hooks", async () => {
  const actual =
    await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useReducedMotion: vi.fn(() => {
      return false;
    }),
  };
});

const extentState = vi.hoisted(() => {
  return {
    extent: {
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-31T00:00:00.000Z",
    } as AvaMapConfigT.TimeRange | undefined,
  };
});

vi.mock("@/views/GisApp/shell/MapTimeSlider/useMapTimeExtent", () => {
  return {
    useMapTimeExtent: () => {
      return extentState.extent;
    },
  };
});

const { MapTimeSlider } =
  await import("@/views/GisApp/shell/MapTimeSlider/MapTimeSlider");

const WORKSPACE_ID = uuid<Workspace.Id>();
const JANUARY: AvaMapConfig.TimeRange = {
  start: "2026-01-01T00:00:00.000Z",
  end: "2026-01-31T00:00:00.000Z",
};

function _layerWithTimeColumn(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Cases");
  return { ...layer, timeColumn: uuid<QueryColumn.Id>() };
}

function _renderSlider(options?: {
  layers?: readonly MapLayer.T[];
  timeRange?: AvaMapConfig.TimeRange | undefined;
  updateConfig?: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
}): ReturnType<typeof vi.fn> {
  const updateConfig = vi.fn(options?.updateConfig);
  render(
    <MapTimeSlider
      layers={options?.layers ?? [_layerWithTimeColumn()]}
      timeRange={options?.timeRange}
      updateConfig={updateConfig}
      workspaceId={WORKSPACE_ID}
    />,
  );
  return updateConfig;
}

describe("MapTimeSlider", () => {
  beforeEach(() => {
    extentState.extent = JANUARY;
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("hides the slider when no layer has a time column", () => {
    _renderSlider({ layers: [MapLayer.makeEmpty("Cases")] });

    expect(
      screen.queryByRole("group", { name: "Time range" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Play" }),
    ).not.toBeInTheDocument();
  });

  it("shows the slider and play when a layer has a time column", () => {
    _renderSlider();

    expect(
      screen.getByRole("group", { name: "Time range" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("hides play under reduced motion and keeps the slider", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    _renderSlider();

    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    expect(
      screen.getByRole("group", { name: "Time range" }),
    ).toBeInTheDocument();
  });

  it("places handles at 0 and 1000 without writing an unset range", () => {
    const updateConfig = _renderSlider({ timeRange: undefined });
    const thumbs = screen.getAllByRole("slider");

    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "0");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "1000");
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it("writes a time range when the user moves a handle with the keyboard", () => {
    const updateConfig = _renderSlider({ timeRange: undefined });
    const thumbs = screen.getAllByRole("slider");
    fireEvent.focus(thumbs[1]!);
    fireEvent.keyDown(thumbs[1]!, { key: "ArrowLeft" });
    fireEvent.keyUp(thumbs[1]!, { key: "ArrowLeft" });

    expect(updateConfig).toHaveBeenCalledOnce();
    const updated = updateConfig.mock.calls[0]![0](AvaMapConfig.makeEmpty());
    expect(updated.timeRange).toEqual({
      start: JANUARY.start,
      end: "2026-01-30T23:16:48.000Z",
    });
  });

  it("shifts the saved window when play is pressed", () => {
    const timeRange: AvaMapConfig.TimeRange = {
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-11T00:00:00.000Z",
    };
    const updateConfig = _renderSlider({ timeRange });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    const updated = updateConfig.mock.calls[0]![0]({
      ...AvaMapConfig.makeEmpty(),
      timeRange,
    });
    expect(updated.timeRange).toEqual({
      start: "2026-01-11T00:00:00.000Z",
      end: "2026-01-21T00:00:00.000Z",
    });
  });

  it("clamps a saved range through updateConfig only when it differs", () => {
    const timeRange: AvaMapConfig.TimeRange = {
      start: "2025-12-01T00:00:00.000Z",
      end: "2026-01-15T00:00:00.000Z",
    };
    const updateConfig = _renderSlider({ timeRange });
    const updated = updateConfig.mock.calls[0]![0]({
      ...AvaMapConfig.makeEmpty(),
      timeRange,
    });
    expect(updated.timeRange).toEqual({
      start: JANUARY.start,
      end: "2026-01-15T00:00:00.000Z",
    });
  });

  it("does not rewrite a range that already fits the extent", () => {
    const updateConfig = _renderSlider({
      timeRange: {
        start: "2026-01-05T00:00:00.000Z",
        end: "2026-01-20T00:00:00.000Z",
      },
    });
    expect(updateConfig).not.toHaveBeenCalled();
  });
});
