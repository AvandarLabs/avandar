import { Img, staticFile } from "remotion";
import { MONO } from "../../fonts";
import { DUR, STAGGER_COLUMN, caretOn, enter, typed } from "../../motion";
import { safePublicPath, textUnits } from "../layout/layout";
import { positioned, SceneShell } from "../SceneShell";
import { getLineRevealStyle, getWipeExitStyle } from "../textReveal";
import {
  MARK_BUILD_DEFAULTS,
  getCtaBeats,
  getFlightColumnRect,
  getFlightProgress,
  getMarkBuildEndFrame,
  getMarkBuildProgress,
} from "./brandLockupMotion";
import type { Rect } from "../layout/layout";
import type { BrandLockupSceneProps } from "../scenes.types";

/** Largest rotation of the flying columns, at the middle of the flight. */
const FLIGHT_TILT_DEGREES = 28;
/** Perspective distance of the fly-through, in pixels. */
const FLIGHT_PERSPECTIVE = 1400;
/** Default command typing speed, about one character per frame. */
const COMMAND_CHARS_PER_SECOND = 30;

/**
 * A brand mark with an optional wordmark, centred on the field, for an
 * opening or closing card. The mark can build through column masks, the
 * wordmark wipes in beside it, a CTA stack (subtitle, URL, typed command,
 * badge) can cascade in below, and the mark's columns can fly through the
 * frame to hand over to the next shot's field colour.
 */
export function BrandLockupScene(props: BrandLockupSceneProps) {
  const { frame, width = 1600, height = 1000, wordmark, cta } = props;
  const geometry = _getLockupGeometry(props, width, height);
  const wordmarkAt =
    props.wordmarkAtFrame ?? getMarkBuildEndFrame(props.build) + DUR.sheet;
  return (
    <SceneShell frame={frame} width={width} height={height}>
      <_Mark {...props} mark={geometry.mark} width={width} height={height} />
      {wordmark && geometry.wordmark ? (
        <div
          style={{
            ...positioned(geometry.wordmark),
            ...(props.exit
              ? getWipeExitStyle(frame, props.exit.atFrame, DUR.chip)
              : {}),
          }}
        >
          <div
            style={{
              fontSize: geometry.wordmarkFontSize,
              lineHeight: `${geometry.wordmark.height}px`,
              fontWeight: 600,
              letterSpacing: -geometry.wordmarkFontSize * 0.03,
              whiteSpace: "nowrap",
              ...getLineRevealStyle(frame, wordmarkAt, "wipe"),
            }}
          >
            {wordmark}
          </div>
        </div>
      ) : null}
      {cta ? (
        <_LockupCta frame={frame} cta={cta} width={width} height={height} />
      ) : null}
    </SceneShell>
  );
}

/** Pixel boxes of the mark and wordmark, centred together as one lockup. */
function _getLockupGeometry(
  { logo, wordmark, cta }: BrandLockupSceneProps,
  width: number,
  height: number,
) {
  const markHeight = logo.height ?? Math.round(height * 0.167);
  const markWidth = markHeight * (logo.aspectRatio ?? 1);
  const wordmarkFontSize = markHeight * 0.72;
  const gap = markHeight * 0.22;
  const wordmarkWidth = wordmark
    ? textUnits(wordmark) * wordmarkFontSize * 1.05
    : 0;
  const groupWidth = markWidth + (wordmark ? gap + wordmarkWidth : 0);
  const left = (width - groupWidth) / 2;
  const centerY = height * (cta ? 0.235 : 0.445);
  const mark = {
    x: left,
    y: centerY - markHeight / 2,
    width: markWidth,
    height: markHeight,
  };
  return {
    mark,
    wordmarkFontSize,
    wordmark: wordmark
      ? {
          x: left + markWidth + gap,
          y: mark.y,
          width: wordmarkWidth,
          height: markHeight,
        }
      : undefined,
  };
}

/** The mark: whole at rest, as column masks while building or flying. */
function _Mark({
  frame,
  logo,
  build,
  exit,
  mark,
  width,
  height,
}: BrandLockupSceneProps & { mark: Rect; width: number; height: number }) {
  const src = staticFile(safePublicPath(logo.src));
  const columns = build?.columns ?? MARK_BUILD_DEFAULTS.columns;
  const isBuilt = frame >= getMarkBuildEndFrame(build);
  const isFlying = getFlightProgress(frame, exit).flight > 0;
  if (isBuilt && !isFlying) {
    return (
      <Img
        src={src}
        alt=""
        style={{ ...positioned(mark), objectFit: "fill" }}
      />
    );
  }
  const rise = getMarkBuildProgress(frame, build, columns);
  const flights = rise.map(
    (_, index) =>
      getFlightProgress(frame - index * STAGGER_COLUMN, exit).flight,
  );
  const meanFlight = flights.reduce((sum, value) => sum + value, 0) / columns;
  const tilt = FLIGHT_TILT_DEGREES * Math.sin(Math.PI * meanFlight);
  const cover = getFlightProgress(frame, exit).cover;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: FLIGHT_PERSPECTIVE,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotateY(${tilt.toFixed(2)}deg)`,
        }}
      >
        {rise.map((columnRise, index) => {
          const rect = getFlightColumnRect(
            index,
            columns,
            mark,
            { width, height },
            flights[index],
          );
          return (
            <div
              key={index}
              style={{
                ...positioned(rect),
                overflow: "hidden",
                clipPath: `inset(${((1 - columnRise) * 100).toFixed(2)}% 0 0 0)`,
              }}
            >
              <Img
                src={src}
                alt=""
                style={{
                  position: "absolute",
                  left: -index * rect.width,
                  top: 0,
                  width: rect.width * columns,
                  height: rect.height,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `var(--${exit?.color ?? "brand"})`,
                  opacity: cover,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Subtitle, URL, typed command and badge, cascading in below the mark. */
function _LockupCta({
  frame,
  cta,
  width,
  height,
}: {
  frame: number;
  cta: NonNullable<BrandLockupSceneProps["cta"]>;
  width: number;
  height: number;
}) {
  const cps = cta.commandCharsPerSecond ?? COMMAND_CHARS_PER_SECOND;
  const beats = getCtaBeats(cta, cps);
  const line = (top: number, fontSize: number) => ({
    position: "absolute" as const,
    left: width * 0.1,
    width: width * 0.8,
    top: height * top,
    textAlign: "center" as const,
    fontSize,
    lineHeight: 1.2,
    whiteSpace: "nowrap" as const,
  });
  const isTyping = frame >= beats.typingAt && frame < beats.typingEnd;
  return (
    <>
      {cta.subtitle ? (
        <div
          style={{
            ...line(0.43, height * 0.042),
            color: "var(--muted-foreground)",
            ...enter(frame, beats.subtitleAt, { y: 0 }),
          }}
        >
          {cta.subtitle}
        </div>
      ) : null}
      {cta.url ? (
        <div
          style={{
            ...line(0.54, height * 0.09),
            fontWeight: 700,
            ...enter(frame, beats.urlAt, { y: 0 }),
          }}
        >
          {cta.url}
        </div>
      ) : null}
      {cta.command ? (
        <div
          style={{
            ...line(0.735, height * 0.03),
            fontFamily: MONO,
            opacity: frame >= beats.promptAt ? 1 : 0,
          }}
        >
          <span style={{ color: "var(--muted-foreground)" }}>$ </span>
          {typed(frame, beats.typingAt, cta.command, cps)}
          <span
            style={{
              display: "inline-block",
              width: "0.6em",
              height: "1.1em",
              verticalAlign: "-0.2em",
              background: "var(--brand)",
              opacity: isTyping || caretOn(frame) ? 1 : 0,
            }}
          />
        </div>
      ) : null}
      {cta.badge ? (
        <div
          style={{
            ...line(0.86, height * 0.022),
            ...enter(frame, beats.badgeAt, { y: 0 }),
          }}
        >
          <span
            style={{
              padding: "0.35em 0.9em",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: "var(--muted-foreground)",
            }}
          >
            {cta.badge}
          </span>
        </div>
      ) : null}
    </>
  );
}
