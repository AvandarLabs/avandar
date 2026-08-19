import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import css from "@/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay.module.css";
import {
  applyTextOverlayDrag,
  beginTextMoveDrag,
  beginTextResizeDrag,
  endTextOverlayDrag,
} from "@/views/GisApp/shell/AnnotationTextOverlay/textOverlayDrag";
import {
  MAP_TOOL_TEXT_SIZE_MAX_PX,
  MAP_TOOL_TEXT_SIZE_MIN_PX,
} from "@/views/GisApp/tools/MapToolGesture.constants";
import type { TextOverlayDrag } from "@/views/GisApp/shell/AnnotationTextOverlay/textOverlayDrag";
import type { TextFeature } from "@/views/GisApp/shell/AnnotationTextOverlay/useProjectedOverlayPoint";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ReactNode, RefObject } from "react";

type Props = {
  map: MapLibreMap;
  feature: TextFeature;
  onMove: (coordinates: [number, number]) => void;
  onResize: (sizePx: number) => void;
  onStartEdit: () => void;
};

function _isResizeHandle(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && target.getAttribute("role") === "slider"
  );
}

function useTextSelectPointer(
  map: MapLibreMap,
  feature: TextFeature,
  frameRef: RefObject<HTMLDivElement | null>,
  dragRef: { current: TextOverlayDrag },
  onMove: Props["onMove"],
  onResize: Props["onResize"],
): void {
  useEffect(
    function bindTextSelectPointer() {
      const frame = frameRef.current;
      if (!frame) {
        return undefined;
      }
      const onPointerDown = (event: PointerEvent): void => {
        if (event.button === 2) {
          return;
        }
        dragRef.current =
          _isResizeHandle(event.target) ?
            beginTextResizeDrag(map, event, feature.sizePx)
          : beginTextMoveDrag(map, event, feature.geometry.coordinates);
      };
      const onPointerMove = (event: PointerEvent): void => {
        applyTextOverlayDrag(map, event, dragRef.current, onMove, onResize);
      };
      const onPointerUp = (): void => {
        if (dragRef.current.type === "idle") {
          return;
        }
        dragRef.current = endTextOverlayDrag(map);
      };
      frame.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return () => {
        frame.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
    },
    [dragRef, feature, frameRef, map, onMove, onResize],
  );
}

/**
 * Select-mode chrome for a text annotation: drag to move, handle to resize.
 */
export function AnnotationTextSelectFrame({
  map,
  feature,
  onMove,
  onResize,
  onStartEdit,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<TextOverlayDrag>({ type: "idle" });
  useTextSelectPointer(map, feature, frameRef, dragRef, onMove, onResize);
  return (
    <div
      ref={frameRef}
      className={css.annotationTextSelection}
      data-testid="annotation-text-selection"
      role="group"
      tabIndex={0}
      aria-label={t`Move annotation text`}
      onDoubleClick={onStartEdit}
    >
      {feature.text}
      <div
        className={css.annotationTextResizeHandle}
        role="slider"
        aria-label={t`Resize annotation text`}
        aria-valuemin={MAP_TOOL_TEXT_SIZE_MIN_PX}
        aria-valuemax={MAP_TOOL_TEXT_SIZE_MAX_PX}
        aria-valuenow={feature.sizePx}
      />
    </div>
  );
}
