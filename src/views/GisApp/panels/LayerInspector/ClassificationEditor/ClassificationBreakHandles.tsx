import { useLingui } from "@lingui/react/macro";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import css from "./ClassificationEditor.module.css";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  breaks: readonly number[];
  onLayerChange: LayerChangeHandler;
};

function _moveBreak(props: Props, index: number, value: number): void {
  const breaks = props.breaks.map((currentValue, currentIndex) => {
    return currentIndex === index ? value : currentValue;
  });
  props.onLayerChange((current) => {
    return MapLayerUpdates.withManualBreaks(current, breaks);
  });
}

/** Provides keyboard and pointer-accessible manual break handles. */
export function ClassificationBreakHandles(props: Props): ReactNode {
  const { t } = useLingui();
  if (props.breaks.length === 0) {
    return null;
  }
  return (
    <div className={css.handles} aria-live="polite">
      {props.breaks.map((value, index) => {
        const label = t`Break ${index + 1} of ${props.breaks.length}, ${value}`;
        return (
          <button
            aria-label={label}
            aria-valuenow={value}
            className={css.handle}
            key={index}
            role="slider"
            type="button"
            onKeyDown={(event) => {
              return _onHandleKeyDown(event, props, index, value);
            }}
            onPointerUp={(event) => {
              return _onHandlePointerUp(event, props, index);
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function _onHandleKeyDown(
  event: KeyboardEvent,
  props: Props,
  index: number,
  value: number,
): void {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  _moveBreak(props, index, value + direction * (event.shiftKey ? 10 : 1));
}

function _onHandlePointerUp(
  event: PointerEvent<HTMLButtonElement>,
  props: Props,
  index: number,
): void {
  const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
  if (!bounds || bounds.width === 0) {
    return;
  }
  const minimum = props.breaks[0]!;
  const maximum = props.breaks.at(-1)!;
  const ratio = Math.min(
    1,
    Math.max(0, (event.clientX - bounds.left) / bounds.width),
  );
  _moveBreak(props, index, minimum + (maximum - minimum) * ratio);
}
