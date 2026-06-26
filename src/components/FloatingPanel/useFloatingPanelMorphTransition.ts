import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ANIMATION_PRESET, buildAnimateOriginStyle } from "@/config/Theme";
import type { AnimateTargetAnchor } from "@/config/Theme/buildAnimateOriginStyle";
import type { AnimationEvent, CSSProperties, RefObject } from "react";

export type FloatingPanelAnimationPhase = "enter" | "exit" | undefined;

type FloatingPanelInitialPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

type Options = {
  opened: boolean;
  originRef?: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  /**
   * Saved viewport position; used so ooze origin matches the button before
   * layout.
   */
  initialPosition?: FloatingPanelInitialPosition;
};

type MorphTransitionState = {
  isRendered: boolean;
  animationPhase: FloatingPanelAnimationPhase;
  panelAnimationStyle: CSSProperties;
  isAnimating: boolean;
  /** Panel is mounted but waiting for position + origin before ooze-in runs. */
  isEnterPending: boolean;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
};

function _resolveTargetAnchor(
  initialPosition: FloatingPanelInitialPosition | undefined,
  panel: HTMLElement,
): AnimateTargetAnchor | undefined {
  const styleLeft = Number.parseFloat(panel.style.left);
  const styleTop = Number.parseFloat(panel.style.top);
  if (Number.isFinite(styleLeft) && Number.isFinite(styleTop)) {
    return { left: styleLeft, top: styleTop };
  }

  if (
    initialPosition?.left != null &&
    initialPosition?.top != null &&
    Number.isFinite(initialPosition.left) &&
    Number.isFinite(initialPosition.top)
  ) {
    return {
      left: initialPosition.left,
      top: initialPosition.top,
    };
  }

  const panelRect = panel.getBoundingClientRect();
  if (panelRect.width <= 0 || panelRect.height <= 0) {
    return undefined;
  }

  return { left: panelRect.left, top: panelRect.top };
}

function _buildOozeOriginStyle(
  originRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  initialPosition: FloatingPanelInitialPosition | undefined,
): CSSProperties {
  const origin = originRef.current;
  const panel = panelRef.current;
  if (!origin || !panel) {
    return {};
  }

  const anchor = _resolveTargetAnchor(initialPosition, panel);
  if (!anchor) {
    return {};
  }

  return buildAnimateOriginStyle(origin.getBoundingClientRect(), anchor);
}

/**
 * Opening: theme ooze-in preset from a trigger. Closing: theme swipe-out
 * preset.
 */
export function useFloatingPanelMorphTransition({
  opened,
  originRef,
  panelRef,
  initialPosition,
}: Options): MorphTransitionState {
  const morphEnabled = originRef != null;

  const [isRendered, setIsRendered] = useState(opened);
  const [animationPhase, setAnimationPhase] =
    useState<FloatingPanelAnimationPhase>();
  const [panelAnimationStyle, setPanelAnimationStyle] = useState<CSSProperties>(
    {},
  );
  const [isEnterPending, setIsEnterPending] = useState(false);

  const prevOpenedRef = useRef(opened);
  const hasInitializedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const initialPositionRef = useRef(initialPosition);
  initialPositionRef.current = initialPosition;

  const clearFallbackTimeout = useCallback((): void => {
    if (fallbackTimeoutRef.current != null) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = undefined;
    }
  }, []);

  const finishEnter = useCallback((): void => {
    setAnimationPhase(undefined);
    setIsEnterPending(false);
    setPanelAnimationStyle({});
  }, []);

  const finishExit = useCallback((): void => {
    setIsRendered(false);
    setAnimationPhase(undefined);
    setIsEnterPending(false);
    setPanelAnimationStyle({});
  }, []);

  const scheduleFallback = useCallback(
    (phase: FloatingPanelAnimationPhase, onComplete: () => void): void => {
      if (fallbackTimeoutRef.current != null) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      const durationMs =
        phase === "enter" ?
          ANIMATION_PRESET.oozeIn.durationMs
        : ANIMATION_PRESET.swipeOut.durationMs;
      fallbackTimeoutRef.current = setTimeout(onComplete, durationMs + 40);
    },
    [],
  );

  useLayoutEffect(
    function runMorphTransition() {
      clearFallbackTimeout();
      let aborted = false;
      const cleanup = (): void => {
        aborted = true;
      };

      if (!morphEnabled || !originRef) {
        setIsRendered(opened);
        setAnimationPhase(undefined);
        setIsEnterPending(false);
        setPanelAnimationStyle({});
        prevOpenedRef.current = opened;
        return cleanup;
      }

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        prevOpenedRef.current = opened;
        setIsRendered(opened);
        return cleanup;
      }

      const wasOpened = prevOpenedRef.current;
      prevOpenedRef.current = opened;
      const isOpening = opened && !wasOpened;
      const isClosing = !opened && wasOpened;
      const isAlreadyOpen = opened && wasOpened;

      const scheduleFrame = (fn: () => void): void => {
        requestAnimationFrame(() => {
          if (!aborted) {
            fn();
          }
        });
      };

      const commitEnter = (): void => {
        setIsEnterPending(false);
        setAnimationPhase("enter");
        scheduleFallback("enter", finishEnter);
      };

      const runEnter = (): void => {
        if (aborted) {
          return;
        }
        const panel = panelRef.current;
        const anchor =
          panel ?
            _resolveTargetAnchor(initialPositionRef.current, panel)
          : undefined;

        if (!panel || !anchor) {
          scheduleFrame(runEnter);
          return;
        }

        const style = _buildOozeOriginStyle(
          originRef,
          panelRef,
          initialPositionRef.current,
        );
        const hasOrigin = Object.keys(style).length > 0;

        if (hasOrigin) {
          setPanelAnimationStyle(style);
          scheduleFrame(() => {
            scheduleFrame(commitEnter);
          });
        } else {
          // Origin button isn't in the DOM yet (re-render race). Skip the
          // morph animation rather than polling forever; the panel still opens.
          commitEnter();
        }
      };

      if (isOpening) {
        setIsRendered(true);
        setIsEnterPending(true);
        setAnimationPhase(undefined);
        runEnter();
      } else if (isClosing) {
        setIsEnterPending(false);
        setAnimationPhase("exit");
        scheduleFallback("exit", finishExit);
      } else if (isAlreadyOpen) {
        setIsRendered(true);
        setIsEnterPending(false);
      }

      return cleanup;
    },
    [
      clearFallbackTimeout,
      finishEnter,
      finishExit,
      morphEnabled,
      opened,
      originRef,
      panelRef,
      scheduleFallback,
    ],
  );

  useLayoutEffect(() => {
    return clearFallbackTimeout;
  }, [clearFallbackTimeout]);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>): void => {
      if (event.target !== panelRef.current) {
        return;
      }

      clearFallbackTimeout();

      if (animationPhase === "enter") {
        finishEnter();
        return;
      }

      if (animationPhase === "exit") {
        finishExit();
      }
    },
    [animationPhase, clearFallbackTimeout, finishEnter, finishExit, panelRef],
  );

  return {
    isRendered: morphEnabled ? isRendered : opened,
    animationPhase: morphEnabled ? animationPhase : undefined,
    panelAnimationStyle: morphEnabled ? panelAnimationStyle : {},
    isAnimating: morphEnabled && animationPhase !== undefined,
    isEnterPending: morphEnabled && isEnterPending,
    onAnimationEnd,
  };
}
