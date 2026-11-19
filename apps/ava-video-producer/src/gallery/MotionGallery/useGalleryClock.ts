import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// One browser clock serves all visible previews. The renderer receives only
// frames.
const clockListeners = new Set<(elapsed: number) => void>();
let clockRequest = 0;
let lastTick = 0;
function clockTick(time: number) {
  const elapsed = lastTick ? Math.min(time - lastTick, 100) : 0;
  lastTick = time;
  if (!document.hidden)
    clockListeners.forEach((listener) => {
      return listener(elapsed);
    });
  clockRequest = requestAnimationFrame(clockTick);
}
function subscribeClock(listener: (elapsed: number) => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    lastTick = 0;
    clockRequest = requestAnimationFrame(clockTick);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size) {
      cancelAnimationFrame(clockRequest);
      lastTick = 0;
    }
  };
}

/**
 * Advances a loop frame counter from the shared clock while `active` is true.
 */
export function useFrames(
  active: boolean,
  length: number,
  initial = 45,
): readonly [number, (value: number) => void] {
  const [frame, updateFrame] = useState(initial);
  const current = useRef(initial);
  const remainder = useRef(0);
  const setFrame = useCallback(
    (value: number) => {
      current.current = Math.max(0, Math.min(length - 1, value));
      remainder.current = 0;
      updateFrame(current.current);
    },
    [length],
  );
  useEffect(
    function advanceFrameOnClockTick() {
      if (!active) return;
      return subscribeClock((elapsed) => {
        remainder.current += elapsed;
        const steps = Math.floor(remainder.current / (1000 / 30));
        if (steps < 1) return;
        remainder.current -= steps * (1000 / 30);
        current.current = (current.current + steps) % length;
        updateFrame(current.current);
      });
    },
    [active, length],
  );
  return [frame, setFrame] as const;
}

/**
 * Tracks whether the element a ref is attached to is intersecting the viewport.
 */
export function useVisible(): readonly [
  RefObject<HTMLButtonElement | null>,
  boolean,
] {
  const element = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(function observeCardVisibility() {
    if (!element.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        return setVisible(entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    observer.observe(element.current);
    return () => {
      return observer.disconnect();
    };
  }, []);
  return [element, visible] as const;
}
