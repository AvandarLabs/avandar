import { describe, expect, it } from "vitest";
import {
  ANIMATION_PRESET,
  AnimationTheme,
  DEFAULT_NOTIFICATIONS_PROPS,
  MODAL_CONTENT_TRANSITION,
} from "@/config/Theme/AnimationTheme/AnimationTheme";
import { buildAnimateOriginStyle } from "@/config/Theme/buildAnimateOriginStyle";

describe("AnimationTheme presets", () => {
  it("exposes ooze-in and swipe-out on theme.other.animation", () => {
    expect(AnimationTheme.preset.oozeIn.className).toBe("ava-animate-ooze-in");
    expect(AnimationTheme.preset.swipeOut.className).toBe(
      "ava-animate-swipe-out",
    );
  });

  it("buildAnimateOriginStyle maps trigger center to target-local coords", () => {
    const fromRect = buildAnimateOriginStyle(
      { left: 100, top: 50, width: 80, height: 24 } as DOMRect,
      { left: 32, top: 140, width: 380, height: 400 } as DOMRect,
    );
    const fromAnchor = buildAnimateOriginStyle(
      { left: 100, top: 50, width: 80, height: 24 } as DOMRect,
      { left: 32, top: 140 },
    );

    const fromRectVars = fromRect as Record<string, string>;
    expect(fromRectVars["--ava-animate-origin-x"]).toBe("108px");
    expect(fromRectVars["--ava-animate-origin-y"]).toBe("-78px");
    expect(fromAnchor).toEqual(fromRect);
  });

  it("uses spring scale-blur pop for modals", () => {
    expect(MODAL_CONTENT_TRANSITION.duration).toBe(
      ANIMATION_PRESET.popIn.durationMs,
    );
    expect(MODAL_CONTENT_TRANSITION.timingFunction).toBe(
      AnimationTheme.easing.pop,
    );
    expect(MODAL_CONTENT_TRANSITION.transition.out.transform).toBe(
      ANIMATION_PRESET.popIn.from.transform,
    );
    expect(MODAL_CONTENT_TRANSITION.transition.out.filter).toBe(
      ANIMATION_PRESET.popIn.from.filter,
    );
  });

  it("exposes the overlay pop-in entrance as a reusable preset", () => {
    expect(ANIMATION_PRESET.popIn.className).toBe("ava-animate-pop-in");
    expect(AnimationTheme.easing.pop).toBe("cubic-bezier(0.34, 1.56, 0.64, 1)");
    expect(ANIMATION_PRESET.popIn.from.transform).toContain("scale(0.72)");
  });

  it("uses distinct durations for enter and exit presets", () => {
    expect(ANIMATION_PRESET.oozeIn.durationMs).toBeGreaterThan(
      ANIMATION_PRESET.swipeOut.durationMs,
    );
  });

  it("anchors toasts at bottom-center with slide-up motion", () => {
    expect(DEFAULT_NOTIFICATIONS_PROPS.position).toBe("bottom-center");
    expect(AnimationTheme.mantine.notification.transition).toBe("slide-up");
    expect(DEFAULT_NOTIFICATIONS_PROPS.transitionDuration).toBe(
      AnimationTheme.mantine.notification.duration,
    );
  });
});
