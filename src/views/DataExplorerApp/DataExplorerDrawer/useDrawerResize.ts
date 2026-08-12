import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DrawerHeight } from "@/views/DataExplorerApp/DataExplorerDrawer/DrawerHeight/DrawerHeight";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

type Options = {
  /**
   * The chart area the drawer is docked beneath. It is the drawer's flex
   * sibling, so its height plus the drawer's own height is the region the two
   * share.
   */
  chartRef: RefObject<HTMLElement | null>;
};

type DrawerResize = {
  /** Current expanded height, in pixels. */
  height: number;

  /** Tallest height currently allowed, for the separator's ARIA range. */
  maxHeight: number;

  /** Pointer-drag handler for the resize separator. */
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;

  /** Arrow / Home / End handler for the resize separator. */
  onResizeKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

type DragState = {
  pointerId: number;
  startClientY: number;
  startHeight: number;
  availableHeight: number;
};

/**
 * Owns the expanded height of the Data Explorer drawer and the drag plus
 * keyboard interactions that change it. The height is deliberately not
 * persisted: it resets with the view, the same as the drawer's collapsed state
 * and active tab.
 *
 * The chart area is measured into state rather than read during render, so the
 * separator's ARIA range is correct on the first paint and follows the chart as
 * the window or the AI chat panel resizes it.
 */
export function useDrawerResize({ chartRef }: Options): DrawerResize {
  const [height, setHeight] = useState<number>(DrawerHeight.DEFAULT_HEIGHT);
  const [chartHeight, setChartHeight] = useState(0);

  useLayoutEffect(
    function measureChartArea() {
      const chart = chartRef.current;
      if (!chart) {
        return undefined;
      }

      const measure = (): void => {
        setChartHeight(chart.getBoundingClientRect().height);
      };
      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(chart);
      return () => {
        observer.disconnect();
      };
    },
    [chartRef],
  );

  // The chart shrinks by exactly what the drawer takes, so the sum is the
  // region they split and stays constant while dragging.
  const availableHeight = chartHeight > 0 ? chartHeight + height : 0;

  // Mirrored into refs so the drag and keyboard handlers can read the latest
  // values without being re-created on every frame of a drag. Synced in an
  // effect rather than during render, which would mutate a ref mid-render.
  const availableHeightRef = useRef(availableHeight);
  const heightRef = useRef(height);
  useEffect(
    function syncLatestHeights() {
      heightRef.current = height;
      availableHeightRef.current = availableHeight;
    },
    [height, availableHeight],
  );

  const dragStateRef = useRef<DragState | undefined>(undefined);

  const onResizePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      // A drag already in flight owns the pointer; a second one would register
      // a competing set of listeners.
      if (dragStateRef.current) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startClientY: event.clientY,
        startHeight: heightRef.current,
        availableHeight: availableHeightRef.current,
      };

      const onPointerMove = (moveEvent: globalThis.PointerEvent): void => {
        const dragState = dragStateRef.current;
        if (dragState && moveEvent.pointerId === dragState.pointerId) {
          // The drawer is anchored to the bottom, so dragging up (a smaller
          // clientY) makes it taller.
          const requestedHeight =
            dragState.startHeight -
            (moveEvent.clientY - dragState.startClientY);
          setHeight(
            DrawerHeight.clamp({
              requestedHeight,
              availableHeight: dragState.availableHeight,
            }),
          );
        }
      };

      const onDragEnd = (): void => {
        dragStateRef.current = undefined;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onDragEnd);
        window.removeEventListener("pointercancel", onDragEnd);
        window.removeEventListener("lostpointercapture", onDragEnd);
      };

      // Listening on the window rather than the separator means the drag still
      // ends when the pointer is released elsewhere, or when the separator
      // unmounts because the drawer collapsed mid-drag.
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onDragEnd);
      window.addEventListener("pointercancel", onDragEnd);
      window.addEventListener("lostpointercapture", onDragEnd);
      event.preventDefault();
    },
    [],
  );

  const onResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      const nextHeight = DrawerHeight.resolveHeightForKey({
        key: event.key,
        isShiftPressed: event.shiftKey,
        currentHeight: heightRef.current,
        availableHeight: availableHeightRef.current,
      });
      if (nextHeight !== undefined) {
        event.preventDefault();
        setHeight(nextHeight);
      }
    },
    [],
  );

  useEffect(function endDragOnUnmount() {
    return () => {
      dragStateRef.current = undefined;
    };
  }, []);

  // Before the chart is measured there is no cap to report, so the current
  // height is the honest maximum: never below `aria-valuenow`.
  const maxHeight = DrawerHeight.resolveMaxHeight(availableHeight) ?? height;

  return { height, maxHeight, onResizePointerDown, onResizeKeyDown };
}
