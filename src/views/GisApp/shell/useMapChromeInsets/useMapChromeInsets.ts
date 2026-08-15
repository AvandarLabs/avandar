import { isNonNullish, objectValues, prop } from "@avandar/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefCallback, RefObject } from "react";

/** Padding, in CSS pixels, that keeps map data clear of floating chrome. */
export type MapChromeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type ElementRef = RefObject<HTMLDivElement | null>;

type ChromeElementRefs = {
  topBar: ElementRef;
  leftColumn: ElementRef;
  rightColumn: ElementRef;
};

/** Callback refs and current padding used by the map shell. */
export type MapChromeInsetsResult = {
  topBarRef: RefCallback<HTMLDivElement>;
  leftColumnRef: RefCallback<HTMLDivElement>;
  rightColumnRef: RefCallback<HTMLDivElement>;
  insetsRef: RefObject<MapChromeInsets>;
};

/** Gutter between a panel's edge and the data the camera fits. */
const GUTTER_PX = 24;

/**
 * Bottom clearance for the tool cluster and the status card.
 *
 * A constant rather than a measurement because the cluster is centred and
 * fixed-height, and the status card appears and disappears: measuring it would
 * make the camera's framing depend on whether a warning happens to be showing.
 */
const BOTTOM_INSET_PX = 88;

/** Measures the current chrome elements into camera padding. */
function _getInsets(elementRefs: ChromeElementRefs): MapChromeInsets {
  return {
    top: (elementRefs.topBar.current?.offsetHeight ?? 0) + GUTTER_PX,
    right: (elementRefs.rightColumn.current?.offsetWidth ?? 0) + GUTTER_PX,
    bottom: BOTTOM_INSET_PX,
    left: (elementRefs.leftColumn.current?.offsetWidth ?? 0) + GUTTER_PX,
  };
}

/** Replaces one observed element and refreshes the current padding. */
function _replaceObservedElement(
  options: Readonly<{
    element: HTMLDivElement | null;
    elementRef: ElementRef;
    observer: ResizeObserver | undefined;
    readInsets: () => void;
  }>,
): void {
  const { element, elementRef, observer, readInsets } = options;
  if (elementRef.current) {
    observer?.unobserve(elementRef.current);
  }
  elementRef.current = element;
  if (element) {
    observer?.observe(element);
  }
  readInsets();
}

/** Starts observing mounted chrome elements and returns the cleanup. */
function _observeChromeElements(
  options: Readonly<{
    elementRefs: ChromeElementRefs;
    observerRef: RefObject<ResizeObserver | undefined>;
    readInsets: () => void;
  }>,
): () => void {
  const { elementRefs, observerRef, readInsets } = options;
  const observer = new ResizeObserver(readInsets);
  observerRef.current = observer;
  objectValues(elementRefs)
    .map(prop("current"))
    .filter(isNonNullish)
    .forEach((element) => {
      observer.observe(element);
    });
  readInsets();
  return () => {
    observer.disconnect();
    observerRef.current = undefined;
  };
}

function useChromeElementRefs(
  options: Readonly<{
    elementRefs: ChromeElementRefs;
    observerRef: RefObject<ResizeObserver | undefined>;
    readInsets: () => void;
  }>,
): Pick<
  MapChromeInsetsResult,
  "topBarRef" | "leftColumnRef" | "rightColumnRef"
> {
  const { elementRefs, observerRef, readInsets } = options;
  const setElementRef = useCallback(
    (element: HTMLDivElement | null, elementRef: ElementRef): void => {
      _replaceObservedElement({
        element,
        elementRef,
        observer: observerRef.current,
        readInsets,
      });
    },
    [observerRef, readInsets],
  );
  const topBarRef = useCallback(
    (element: HTMLDivElement | null): void => {
      setElementRef(element, elementRefs.topBar);
    },
    [elementRefs, setElementRef],
  );
  const leftColumnRef = useCallback(
    (element: HTMLDivElement | null): void => {
      setElementRef(element, elementRefs.leftColumn);
    },
    [elementRefs, setElementRef],
  );
  const rightColumnRef = useCallback(
    (element: HTMLDivElement | null): void => {
      setElementRef(element, elementRefs.rightColumn);
    },
    [elementRefs, setElementRef],
  );
  return { leftColumnRef, rightColumnRef, topBarRef };
}

/**
 * Measures the floating panels so camera moves can avoid them.
 *
 * Returns callback refs rather than state so late-mounted panels are observed
 * and measured without re-rendering the whole map app.
 */
export function useMapChromeInsets(): MapChromeInsetsResult {
  const topBarElementRef = useRef<HTMLDivElement | null>(null);
  const leftColumnElementRef = useRef<HTMLDivElement | null>(null);
  const rightColumnElementRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | undefined>(undefined);
  const insetsRef = useRef<MapChromeInsets>({
    top: GUTTER_PX,
    right: GUTTER_PX,
    bottom: BOTTOM_INSET_PX,
    left: GUTTER_PX,
  });

  const elementRefs = useMemo(() => {
    return {
      topBar: topBarElementRef,
      leftColumn: leftColumnElementRef,
      rightColumn: rightColumnElementRef,
    };
  }, []);
  const readInsets = useCallback((): void => {
    insetsRef.current = _getInsets(elementRefs);
  }, [elementRefs]);

  const refs = useChromeElementRefs({
    elementRefs,
    observerRef,
    readInsets,
  });

  useEffect(
    function observeChromeSize() {
      return _observeChromeElements({ elementRefs, observerRef, readInsets });
    },
    [elementRefs, readInsets],
  );

  return { ...refs, insetsRef };
}
