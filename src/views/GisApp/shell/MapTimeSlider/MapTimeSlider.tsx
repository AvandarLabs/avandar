import { propIsDefined } from "@avandar/utils";
import { useReducedMotion } from "@mantine/hooks";
import { useEffect } from "react";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { clampTimeRangeToExtent } from "@/views/GisApp/shell/MapTimeSlider/clampTimeRangeToExtent/clampTimeRangeToExtent";
import { MapTimeSliderBar } from "@/views/GisApp/shell/MapTimeSlider/MapTimeSliderBar";
import { shiftTimeRange } from "@/views/GisApp/shell/MapTimeSlider/shiftTimeRange/shiftTimeRange";
import { useMapTimeExtent } from "@/views/GisApp/shell/MapTimeSlider/useMapTimeExtent";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const SLIDER_MAX = 1000;
const COLLAPSED_STEP_MS = 86_400_000;

type Props = {
  layers: readonly MapLayer.T[];
  timeRange: AvaMapConfig.TimeRange | undefined;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  workspaceId: Workspace.Id;
};

function _hasTimeColumn(layers: readonly MapLayer.T[]): boolean {
  return layers.some(propIsDefined("timeColumn"));
}

function _clockLabel(iso: string | undefined): string {
  return iso === undefined ? "" : new Date(iso).toLocaleString();
}

function _isSameTimeRange(
  left: AvaMapConfig.TimeRange | undefined,
  right: AvaMapConfig.TimeRange | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return left.start === right.start && left.end === right.end;
}

function _sliderValueFromTimeRange(
  timeRange: AvaMapConfig.TimeRange | undefined,
  extent: AvaMapConfig.TimeRange,
): [number, number] {
  if (timeRange === undefined) {
    return [0, SLIDER_MAX];
  }
  const extentStart = Date.parse(extent.start);
  const span = Date.parse(extent.end) - extentStart;
  if (span <= 0) {
    return [0, SLIDER_MAX];
  }
  return [
    Math.round(
      ((Date.parse(timeRange.start) - extentStart) / span) * SLIDER_MAX,
    ),
    Math.round(((Date.parse(timeRange.end) - extentStart) / span) * SLIDER_MAX),
  ];
}

function _timeRangeFromSliderValue(
  value: readonly [number, number],
  extent: AvaMapConfig.TimeRange,
): AvaMapConfig.TimeRange {
  const extentStart = Date.parse(extent.start);
  const span = Date.parse(extent.end) - extentStart;
  if (span <= 0) {
    return extent;
  }
  return {
    start: new Date(extentStart + (value[0] / SLIDER_MAX) * span).toISOString(),
    end: new Date(extentStart + (value[1] / SLIDER_MAX) * span).toISOString(),
  };
}

function _writeTimeRange(options: {
  updateConfig: Props["updateConfig"];
  timeRange: AvaMapConfig.TimeRange | undefined;
}): void {
  options.updateConfig((current) => {
    return AvaMapConfig.withTimeRange({
      config: current,
      timeRange: options.timeRange,
    });
  });
}

function _onSliderChange(options: {
  value: [number, number];
  timeRange: AvaMapConfig.TimeRange | undefined;
  extent: AvaMapConfig.TimeRange | undefined;
  updateConfig: Props["updateConfig"];
}): void {
  const { value, timeRange, extent, updateConfig } = options;
  if (extent === undefined) {
    return;
  }
  if (timeRange === undefined && value[0] === 0 && value[1] === SLIDER_MAX) {
    return;
  }
  _writeTimeRange({
    updateConfig,
    timeRange: _timeRangeFromSliderValue(value, extent),
  });
}

function _onPlay(options: {
  timeRange: AvaMapConfig.TimeRange | undefined;
  extent: AvaMapConfig.TimeRange | undefined;
  updateConfig: Props["updateConfig"];
}): void {
  const { timeRange, extent, updateConfig } = options;
  if (extent === undefined) {
    return;
  }
  _writeTimeRange({
    updateConfig,
    timeRange: shiftTimeRange({
      timeRange: timeRange ?? extent,
      extent,
      collapsedStepMs: COLLAPSED_STEP_MS,
    }),
  });
}

function useClampTimeRangeOnExtent(options: {
  timeRange: AvaMapConfig.TimeRange | undefined;
  extent: AvaMapConfig.TimeRange | undefined;
  updateConfig: Props["updateConfig"];
}): void {
  const { timeRange, extent, updateConfig } = options;
  useEffect(
    function clampSavedTimeRangeToExtent() {
      if (timeRange === undefined) {
        return;
      }
      const clamped = clampTimeRangeToExtent({ timeRange, extent });
      if (_isSameTimeRange(clamped, timeRange)) {
        return;
      }
      _writeTimeRange({ updateConfig, timeRange: clamped });
    },
    [timeRange, extent, updateConfig],
  );
}

/** Map clock range slider with play, shown when a layer binds a time column. */
export function MapTimeSlider({
  layers,
  timeRange,
  updateConfig,
  workspaceId,
}: Readonly<Props>): ReactNode {
  const prefersReducedMotion = useReducedMotion() === true;
  const extent = useMapTimeExtent({ layers, workspaceId });
  useClampTimeRangeOnExtent({ timeRange, extent, updateConfig });
  if (!_hasTimeColumn(layers)) {
    return null;
  }
  return (
    <MapTimeSliderBar
      sliderValue={
        extent === undefined
          ? [0, SLIDER_MAX]
          : _sliderValueFromTimeRange(timeRange, extent)
      }
      prefersReducedMotion={prefersReducedMotion}
      startLabel={_clockLabel(timeRange?.start ?? extent?.start)}
      endLabel={_clockLabel(timeRange?.end ?? extent?.end)}
      onSliderChange={(value) => {
        _onSliderChange({ value, timeRange, extent, updateConfig });
      }}
      onPlay={() => {
        _onPlay({ timeRange, extent, updateConfig });
      }}
    />
  );
}
