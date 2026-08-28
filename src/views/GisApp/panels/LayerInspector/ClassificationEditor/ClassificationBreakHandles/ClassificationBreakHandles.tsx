import { useLingui } from "@lingui/react/macro";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import css from "./ClassificationBreakHandles.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  breaks: readonly number[];
  onLayerChange: LayerChangeHandler;
};

function _moveBreak(options: {
  breaks: readonly number[];
  onLayerChange: LayerChangeHandler;
  index: number;
  value: number;
}): void {
  const { breaks, onLayerChange, index, value } = options;
  const nextBreaks = breaks.map((currentValue, currentIndex) => {
    return currentIndex === index ? value : currentValue;
  });
  onLayerChange((current) => {
    return MapLayerUpdates.withManualBreaks({
      layer: current,
      breaks: nextBreaks,
    });
  });
}

function _onHandleKeyDown(
  event: KeyboardEvent,
  options: {
    breaks: readonly number[];
    onLayerChange: LayerChangeHandler;
    index: number;
    value: number;
  },
): void {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  _moveBreak({
    ...options,
    value: options.value + direction * (event.shiftKey ? 10 : 1),
  });
}

function _onHandlePointerUp(
  event: PointerEvent<HTMLButtonElement>,
  options: {
    breaks: readonly number[];
    onLayerChange: LayerChangeHandler;
    index: number;
  },
): void {
  const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
  if (!bounds || bounds.width === 0) {
    return;
  }
  const minimum = options.breaks[0]!;
  const maximum = options.breaks.at(-1)!;
  const ratio = Math.min(
    1,
    Math.max(0, (event.clientX - bounds.left) / bounds.width),
  );
  _moveBreak({
    ...options,
    value: minimum + (maximum - minimum) * ratio,
  });
}

/** Provides keyboard and pointer-accessible manual break handles. */
export function ClassificationBreakHandles({
  breaks,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  if (breaks.length === 0) {
    return null;
  }
  return (
    <div className={css.classificationBreakHandles} aria-live="polite">
      {breaks.map((value, index) => {
        const label = t`Break ${index + 1} of ${breaks.length}, ${value}`;
        return (
          <button
            aria-label={label}
            aria-valuenow={value}
            className={css.classificationBreakHandle}
            key={value}
            role="slider"
            type="button"
            onKeyDown={(event) => {
              return _onHandleKeyDown(event, {
                breaks,
                onLayerChange,
                index,
                value,
              });
            }}
            onPointerUp={(event) => {
              return _onHandlePointerUp(event, {
                breaks,
                onLayerChange,
                index,
              });
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
