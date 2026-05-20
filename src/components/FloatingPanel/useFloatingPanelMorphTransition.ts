import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ANIMATION_PRESET, buildAnimateOriginStyle } from "@/config/Theme";
import type { AnimateTargetAnchor } from "@/config/Theme/buildAnimateOriginStyle";
import type { AnimationEvent, CSSProperties, RefObject } from "react";

export type FloatingPanelAnimationPhase = "enter" | "exit" | null;

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
  handleAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
};

const POSITION_TOLERANCE_PX = 2;

function _resolveTargetAnchor(
  initialPosition: FloatingPanelInitialPosition | undefined,
  panel: HTMLElement,
): AnimateTargetAnchor | null {
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
    return null;
  }

  return { left: panelRect.left, top: panelRect.top };
}

function _isPanelAtTargetAnchor(
  panel: HTMLElement,
  anchor: AnimateTargetAnchor,
): boolean {
  const styleLeft = Number.parseFloat(panel.style.left);
  const styleTop = Number.parseFloat(panel.style.top);

  return (
    Number.isFinite(styleLeft) &&
    Number.isFinite(styleTop) &&
    Math.abs(styleLeft - anchor.left) <= POSITION_TOLERANCE_PX &&
    Math.abs(styleTop - anchor.top) <= POSITION_TOLERANCE_PX
  );
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
    useState<FloatingPanelAnimationPhase>(null);
  const [panelAnimationStyle, setPanelAnimationStyle] = useState<CSSProperties>(
    {},
  );
  const [isEnterPending, setIsEnterPending] = useState(false);

  const prevOpenedRef = useRef(opened);
  const hasInitializedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPositionRef = useRef(initialPosition);
  initialPositionRef.current = initialPosition;

  const clearFallbackTimeout = useCallback((): void => {
    if (fallbackTimeoutRef.current != null) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const finishEnter = useCallback((): void => {
    setAnimationPhase(null);
    setIsEnterPending(false);
    setPanelAnimationStyle({});
  }, []);

  const finishExit = useCallback((): void => {
    setIsRendered(false);
    setAnimationPhase(null);
    setIsEnterPending(false);
    setPanelAnimationStyle({});
  }, []);

  const scheduleFallback = useCallback(
    (phase: FloatingPanelAnimationPhase, onComplete: () => void): void => {
      const durationMs =
        phase === "enter" ?
          ANIMATION_PRESET.oozeIn.durationMs
        : ANIMATION_PRESET.swipeOut.durationMs;
      fallbackTimeoutRef.current = setTimeout(onComplete, durationMs + 40);
    },
    [],
  );

  useLayoutEffect(() => {
    clearFallbackTimeout();

    if (!morphEnabled || !originRef) {
      setIsRendered(opened);
      setAnimationPhase(null);
      setIsEnterPending(false);
      setPanelAnimationStyle({});
      prevOpenedRef.current = opened;
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevOpenedRef.current = opened;
      setIsRendered(opened);
      return;
    }

    const wasOpened = prevOpenedRef.current;
    prevOpenedRef.current = opened;

    if (opened && !wasOpened) {
      setIsRendered(true);
      setIsEnterPending(true);
      setAnimationPhase(null);

      const runEnter = (): void => {
        const panel = panelRef.current;
        if (!panel) {
          requestAnimationFrame(runEnter);
          return;
        }

        const anchor = _resolveTargetAnchor(initialPositionRef.current, panel);
        if (!anchor) {
          requestAnimationFrame(runEnter);
          return;
        }

        if (!_isPanelAtTargetAnchor(panel, anchor)) {
          requestAnimationFrame(runEnter);
          return;
        }

        const style = _buildOozeOriginStyle(
          originRef,
          panelRef,
          initialPositionRef.current,
        );
        if (Object.keys(style).length === 0) {
          requestAnimationFrame(runEnter);
          return;
        }

        setPanelAnimationStyle(style);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsEnterPending(false);
            setAnimationPhase("enter");
            scheduleFallback("enter", finishEnter);
          });
        });
      };

      runEnter();
      return;
    }

    if (!opened && wasOpened) {
      setIsEnterPending(false);
      setAnimationPhase("exit");
      scheduleFallback("exit", finishExit);
      return;
    }

    if (opened) {
      setIsRendered(true);
      setIsEnterPending(false);
    }
  }, [
    clearFallbackTimeout,
    finishEnter,
    finishExit,
    morphEnabled,
    opened,
    originRef,
    panelRef,
    scheduleFallback,
  ]);

  useLayoutEffect(() => {
    return clearFallbackTimeout;
  }, [clearFallbackTimeout]);

  const handleAnimationEnd = useCallback(
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
    animationPhase: morphEnabled ? animationPhase : null,
    panelAnimationStyle: morphEnabled ? panelAnimationStyle : {},
    isAnimating: morphEnabled && animationPhase != null,
    isEnterPending: morphEnabled && isEnterPending,
    handleAnimationEnd,
  };
}
