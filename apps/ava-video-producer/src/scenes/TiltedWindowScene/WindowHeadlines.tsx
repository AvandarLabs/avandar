import { MONO } from "../../fonts";
import { DUR, EASE, ramp } from "../../motion";
import { fitTextLines } from "../layout/layout";
import { getLineRevealStyle } from "../textReveal";
import { getActiveHeadline } from "./windowMotion";
import { HEADLINE_BOX } from "./windowTilt";
import type { WindowHeadline } from "../scenes.types";

/** Frames between headline lines fading in. */
const LINE_STAGGER = 3;

type Props = {
  frame: number;
  headlines: WindowHeadline[];
  width: number;
  height: number;
  /** The frame the window starts whipping out; the headline fades in place. */
  exitAtFrame?: number;
};

/**
 * The headline column beside a tilted window: lines fade in a few frames
 * apart, a later headline replaces the earlier one, and on exit the copy
 * fades where it stands while the window leaves.
 */
export function WindowHeadlines({
  frame,
  headlines,
  width,
  height,
  exitAtFrame,
}: Props) {
  const { index, opacity } = getActiveHeadline(frame, headlines);
  const headline = headlines[index];
  const columnWidth = width * HEADLINE_BOX.width;
  const fitted = fitTextLines(
    headline.lines,
    columnWidth,
    height * 0.3,
    Math.round(height * 0.066),
    32,
  );
  const exitOpacity =
    exitAtFrame === undefined
      ? 1
      : 1 - ramp(frame, exitAtFrame + 1, DUR.chip, EASE.inOut);
  return (
    <div
      style={{
        position: "absolute",
        left: width * HEADLINE_BOX.x,
        top: height * HEADLINE_BOX.y,
        width: columnWidth,
        opacity: opacity * exitOpacity,
      }}
    >
      {fitted.lines.map((line, row) => (
        <div
          key={`${headline.atFrame}-${row}`}
          style={{
            fontSize: fitted.fontSize,
            lineHeight: 1.25,
            fontWeight: 600,
            letterSpacing: -fitted.fontSize * 0.02,
            color: "var(--foreground)",
            ...getLineRevealStyle(
              frame,
              headline.atFrame + row * LINE_STAGGER,
              "line-fade",
            ),
          }}
        >
          {line}
        </div>
      ))}
      {headline.subtitle ? (
        <div
          style={{
            marginTop: height * 0.02,
            fontFamily: MONO,
            fontSize: Math.round(height * 0.024),
            color: "color-mix(in oklab, var(--foreground) 45%, transparent)",
            ...getLineRevealStyle(
              frame,
              headline.atFrame + fitted.lines.length * LINE_STAGGER,
              "line-fade",
            ),
          }}
        >
          {headline.subtitle}
        </div>
      ) : null}
    </div>
  );
}
