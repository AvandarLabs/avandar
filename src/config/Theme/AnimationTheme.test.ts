import { describe, expect, it } from "vitest";
import {
  ANIMATION_PRESET,
  AnimationTheme,
} from "@/config/Theme/AnimationTheme";
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

    expect(fromRect["--ava-animate-origin-x"]).toBe("108px");
    expect(fromRect["--ava-animate-origin-y"]).toBe("-78px");
    expect(fromAnchor).toEqual(fromRect);
  });

  it("uses distinct durations for enter and exit presets", () => {
    expect(ANIMATION_PRESET.oozeIn.durationMs).toBeGreaterThan(
      ANIMATION_PRESET.swipeOut.durationMs,
    );
  });
});
