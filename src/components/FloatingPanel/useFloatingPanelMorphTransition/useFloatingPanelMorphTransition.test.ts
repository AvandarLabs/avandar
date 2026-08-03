import { makeArrayWithLength } from "@utils/arrays/makeArrayWithLength/makeArrayWithLength";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useFloatingPanelMorphTransition } from "./useFloatingPanelMorphTransition";
import type { RefObject } from "react";

/**
 * Regression tests for the runEnter infinite-rAF loop when the panel's
 * saved position is outside the viewport.
 *
 * Repro: the user drags the panel close to a viewport edge, closes it,
 * then reopens. Mantine's FloatingWindow clamps the rendered position
 * back into the viewport, so panel.style.top/left differs from the raw
 * initialPosition read from localStorage. Before the fix,
 * _isPanelAtTargetAnchor compared inline style against initialPosition
 * and never matched, so runEnter polled forever with no fallback and
 * isEnterPending stayed true permanently, holding the panel at opacity:0.
 *
 * After the fix, _resolveTargetAnchor derives the anchor from the actual
 * inline style first, so the position check converges on the first frame
 * and the ooze-in animation starts normally.
 */

describe("useFloatingPanelMorphTransition — runEnter convergence when Mantine clamps the panel", () => {
  let pendingRafs: FrameRequestCallback[];

  beforeEach(() => {
    pendingRafs = [];
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      pendingRafs.push(callback);
      return pendingRafs.length;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function flushOneFrame(): void {
    const callbacks = pendingRafs.splice(0);
    callbacks.forEach((cb) => {
      return cb(performance.now());
    });
  }

  it("clears isEnterPending and starts the ooze-in animation when Mantine constrains the panel to a different position than initialPosition", () => {
    // The user dragged the panel close to a viewport edge before closing.
    // On reopen, the saved initialPosition (top:540) is outside what Mantine
    // will render with constrainToViewport, so the actual inline style is
    // clamped (top:400).
    //
    // Before the fix: _isPanelAtTargetAnchor compared |400 - 540| against
    // POSITION_TOLERANCE_PX (2) and always failed; runEnter polled forever;
    // isEnterPending stayed true and the panel was invisible.
    //
    // After the fix: _resolveTargetAnchor returns the actual inline-style
    // anchor (top:400), the position check passes on the first frame, and
    // the ooze-in animation kicks off after the 2 nested rAFs.
    const panelElement = document.createElement("div");
    panelElement.style.left = "32px";
    panelElement.style.top = "400px"; // constrained from initialPosition.top of 540

    const panelRef: RefObject<HTMLElement> = { current: panelElement };
    const originRef: RefObject<HTMLElement> = {
      current: document.createElement("div"),
    };

    const { result, rerender } = renderHook(
      ({ opened }: { opened: boolean }) => {
        return useFloatingPanelMorphTransition({
          opened,
          originRef,
          panelRef,
          initialPosition: { top: 540, left: 32 },
        });
      },
      { initialProps: { opened: false } },
    );

    // Open — runEnter fires synchronously in useLayoutEffect.
    act(() => {
      rerender({ opened: true });
    });

    // Flush 5 frames: 1 for runEnter to pass the position check, then
    // 2 nested rAFs to commit state (setIsEnterPending + setAnimationPhase).
    // Extra frames provide headroom for any additional React scheduling.
    makeArrayWithLength(5).forEach(() => {
      act(() => {
        flushOneFrame();
      });
    });

    // The panel should now be visible and animating in.
    expect(result.current.isEnterPending).toBe(false);
    expect(result.current.animationPhase).toBe("enter");
    expect(result.current.isRendered).toBe(true);
  });
});
