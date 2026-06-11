import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useFloatingPanelMorphTransition } from "./useFloatingPanelMorphTransition";
import type { RefObject } from "react";

/**
 * Regression tests for the runEnter infinite-rAF loop (second-tab bug).
 *
 * Root cause: _isPanelAtTargetAnchor compares panel.style.top/left against the
 * raw initialPosition values. When Mantine's FloatingWindow clamps the panel
 * via constrainToViewport:true, the actual inline style differs from
 * initialPosition. The check never passes, runEnter loops forever with no
 * fallback timeout, and isEnterPending stays true permanently — holding the
 * panel at opacity:0.
 *
 * These tests assert the correct behavior: the panel becomes visible after a
 * few frames. Fixed in _resolveTargetAnchor by preferring actual inline style
 * over raw initialPosition values.
 */

describe("useFloatingPanelMorphTransition — runEnter position-mismatch loop", () => {
  let pendingRafs: FrameRequestCallback[];

  beforeEach(() => {
    pendingRafs = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      pendingRafs.push(cb);
      return pendingRafs.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushOneFrame(): void {
    const callbacks = pendingRafs.splice(0);
    callbacks.forEach((cb) => {return cb(performance.now())});
  }

  it("clears isEnterPending and starts the ooze-in animation when Mantine constrains the panel to a different position than initialPosition", () => {
    // Second-tab scenario:
    //   initialPosition.top = 540  (SETTINGS_INITIAL_POSITION or a value
    //   inherited from sessionStorage of the first tab)
    //   Mantine constrainToViewport clamped the actual style to top:400.
    //
    // BUG: _isPanelAtTargetAnchor checks |panel.style.top - anchor.top|
    //      = |400 - 540| = 140 > POSITION_TOLERANCE_PX (2) → always false.
    //      runEnter loops forever; isEnterPending stays true; panel invisible.
    //
    // After the fix: the anchor is derived from the actual inline style (400),
    // _isPanelAtTargetAnchor passes on the first frame, and the ooze-in
    // animation starts — clearing isEnterPending after 2 more rAFs.
    const panelEl = document.createElement("div");
    panelEl.style.left = "32px";
    panelEl.style.top = "400px"; // constrained from initialPosition.top of 540

    const panelRef: RefObject<HTMLElement> = { current: panelEl };
    const originRef: RefObject<HTMLElement> = {
      current: document.createElement("div"),
    };

    const { result, rerender } = renderHook(
      ({ opened }: { opened: boolean }) =>
        {return useFloatingPanelMorphTransition({
          opened,
          originRef,
          panelRef,
          initialPosition: { top: 540, left: 32 },
        })},
      { initialProps: { opened: false } },
    );

    // Open — runEnter fires synchronously in useLayoutEffect.
    act(() => {
      rerender({ opened: true });
    });

    // Flush 5 frames: 1 for runEnter to pass the position check, then
    // 2 nested rAFs to commit state (setIsEnterPending + setAnimationPhase).
    // Extra frames provide headroom for any additional React scheduling.
    Array.from({ length: 5 }).forEach(() => {
      act(() => {
        flushOneFrame();
      });
    });

    // The panel should now be visible and animating in.
    expect(result.current.isEnterPending).toBe(false);
    expect(result.current.animationPhase).toBe("enter");
    expect(result.current.isRendered).toBe(true);
  });

  it("drains the rAF queue once the panel settles — the loop should not run indefinitely", () => {
    // Same constraint mismatch setup.
    // BUG:  every flush re-queues exactly 1 rAF — the loop never exits.
    // Fix:  runEnter succeeds on frame 1, queues 2 more rAFs for the double
    //       requestAnimationFrame chain, then the queue empties (length → 0).
    const panelEl = document.createElement("div");
    panelEl.style.left = "32px";
    panelEl.style.top = "400px";

    const { rerender } = renderHook(
      ({ opened }: { opened: boolean }) =>
        {return useFloatingPanelMorphTransition({
          opened,
          originRef: {
            current: document.createElement("div"),
          } as RefObject<HTMLElement>,
          panelRef: { current: panelEl } as RefObject<HTMLElement>,
          initialPosition: { top: 540, left: 32 },
        })},
      { initialProps: { opened: false } },
    );

    act(() => {
      rerender({ opened: true });
    });

    // Flush enough frames to exhaust the rAF chain after a successful runEnter.
    Array.from({ length: 5 }).forEach(() => {
      act(() => {
        flushOneFrame();
      });
    });

    // Queue should be empty — runEnter exited, the two nested rAFs completed.
    expect(pendingRafs).toHaveLength(0);
  });
});
