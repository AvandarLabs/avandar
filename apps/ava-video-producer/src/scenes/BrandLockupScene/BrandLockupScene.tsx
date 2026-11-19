import { Img, staticFile } from "remotion";
import { typed } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoProps,
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/useVideoTheme";
import { safePublicPath, textUnits } from "../layout/layout";
import { positioned } from "../positioned";
import { SceneShell } from "../SceneShell";
import { getStageTextStyle } from "../stageTheme/stageTheme";
import { getLineRevealStyle, getWipeExitStyle } from "../textReveal";
import {
  MARK_BUILD_DEFAULTS,
  getCtaBeats,
  getFlightColumnRect,
  getFlightProgress,
  getMarkBuildEndFrame,
  getMarkBuildProgress,
} from "./brandLockupMotion";
import type { ThemeTokenName } from "../../storyboard/schema/themeSchema";
import type { ResolvedVideoSemantic } from "../../videoTheme/videoTheme.types";
import type { Rect } from "../layout/layout";
import type { BrandLockupSceneProps } from "../scenes.types";
import type { ReactNode } from "react";

/** Default command typing speed, about one character per frame. */
const COMMAND_CHARS_PER_SECOND = 30;

/**
 * A brand mark with an optional wordmark, centred on the field, for an
 * opening or closing card. The mark can build through column masks, the
 * wordmark wipes in beside it, a CTA stack (subtitle, URL, typed command,
 * badge) can cascade in below, and the mark's columns can fly through the
 * frame to hand over to the next shot's field colour. The build and flight
 * read `components.BrandLockup`, colours the scene palette.
 */
export function BrandLockupScene(props: BrandLockupSceneProps): ReactNode {
  const { frame, width = 1600, height = 1000, wordmark, cta } = props;
  const theme = useVideoTheme();
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps("BrandLockup", {});
  const buildMotion = { motion, columnStagger };
  const geometry = _getLockupGeometry(props, width, height);
  const wordmarkAt =
    props.wordmarkAtFrame ??
    getMarkBuildEndFrame(props.build, buildMotion) + motion.sheet;
  return (
    <SceneShell frame={frame} width={width} height={height}>
      <LockupMark
        {...props}
        mark={geometry.mark}
        width={width}
        height={height}
      />
      {wordmark && geometry.wordmark ? (
        <div
          style={{
            ...positioned(geometry.wordmark),
            ...(props.exit
              ? getWipeExitStyle(frame, props.exit.atFrame, motion.chip, motion)
              : {}),
          }}
        >
          <div
            style={{
              fontSize: geometry.wordmarkFontSize,
              lineHeight: `${geometry.wordmark.height}px`,
              ...getStageTextStyle(theme.semantic.text.stage.wordmark, [
                "fontWeight",
                "letterSpacing",
              ]),
              whiteSpace: "nowrap",
              ...getLineRevealStyle(frame, wordmarkAt, "wipe", {}, motion),
            }}
          >
            {wordmark}
          </div>
        </div>
      ) : null}
      {cta ? (
        <LockupCta frame={frame} cta={cta} width={width} height={height} />
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

/** A storyboard theme name as its scene palette colour, `brand-soft` as
 *  `color.scene.brandSoft`. */
function _sceneColorFromName(
  tokens: ResolvedVideoSemantic,
  name: ThemeTokenName,
): string | undefined {
  const key = name.replace(/-([a-z])/g, (_, letter: string) => {
    return letter.toUpperCase();
  }) as keyof ResolvedVideoSemantic["color"]["scene"];
  return tokens.color.scene[key];
}

/** The mark: whole at rest, as column masks while building or flying. */
function LockupMark({
  frame,
  logo,
  build,
  exit,
  mark,
  width,
  height,
}: BrandLockupSceneProps & { mark: Rect; width: number; height: number }) {
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const { flightTilt, flightPerspective, columnStagger } = useVideoProps(
    "BrandLockup",
    {},
  );
  const buildMotion = { motion, columnStagger };
  const src = staticFile(safePublicPath(logo.src));
  const columns = build?.columns ?? MARK_BUILD_DEFAULTS.columns;
  const isBuilt = frame >= getMarkBuildEndFrame(build, buildMotion);
  const isFlying = getFlightProgress(frame, exit, motion).flight > 0;
  if (isBuilt && !isFlying) {
    return (
      <Img
        src={src}
        alt=""
        style={{ ...positioned(mark), objectFit: "fill" }}
      />
    );
  }
  const rise = getMarkBuildProgress(frame, build, columns, buildMotion);
  const flights = rise.map((_, index) => {
    return getFlightProgress(
      frame - index * motion.stagger.column,
      exit,
      motion,
    ).flight;
  });
  const meanFlight =
    flights.reduce((sum, value) => {
      return sum + value;
    }, 0) / columns;
  // The columns turn most at the middle of the flight.
  const tilt = flightTilt * Math.sin(Math.PI * meanFlight);
  const cover = getFlightProgress(frame, exit, motion).cover;
  const coverColor = _sceneColorFromName(tokens, exit?.color ?? "brand");
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: flightPerspective,
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
              key={`mark-column-${index}`}
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
                  background: coverColor,
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
function LockupCta({
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
  const theme = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const tokens = theme.semantic;
  const scene = tokens.color.scene;
  const badge = tokens.text.stage.badge;
  const cps = cta.commandCharsPerSecond ?? COMMAND_CHARS_PER_SECOND;
  const beats = getCtaBeats(cta, cps, motion);
  const line = (top: number, fontSize: number) => {
    return {
      position: "absolute" as const,
      left: width * 0.1,
      width: width * 0.8,
      top: height * top,
      textAlign: "center" as const,
      fontSize,
      lineHeight: badge.lineHeight,
      whiteSpace: "nowrap" as const,
    };
  };
  const isTyping = frame >= beats.typingAt && frame < beats.typingEnd;
  return (
    <>
      {cta.subtitle ? (
        <div
          style={{
            ...line(0.43, height * 0.042),
            color: scene.mutedForeground,
            ...motion.enter(frame, beats.subtitleAt, { y: 0 }),
          }}
        >
          {cta.subtitle}
        </div>
      ) : null}
      {cta.url ? (
        <div
          style={{
            ...line(0.54, height * 0.09),
            ...getStageTextStyle(badge, ["fontWeight"]),
            ...motion.enter(frame, beats.urlAt, { y: 0 }),
          }}
        >
          {cta.url}
        </div>
      ) : null}
      {cta.command ? (
        <div
          style={{
            ...line(0.735, height * 0.03),
            fontFamily: tokens.text.stage.command.fontFamily,
            opacity: frame >= beats.promptAt ? 1 : 0,
          }}
        >
          <span style={{ color: scene.mutedForeground }}>$ </span>
          {typed(frame, beats.typingAt, cta.command, cps)}
          <span
            style={{
              display: "inline-block",
              width: "0.6em",
              height: "1.1em",
              verticalAlign: "-0.2em",
              background: scene.brand,
              opacity: isTyping || motion.caretOn(frame) ? 1 : 0,
            }}
          />
        </div>
      ) : null}
      {cta.badge ? (
        <div
          style={{
            ...line(0.86, height * 0.022),
            ...motion.enter(frame, beats.badgeAt, { y: 0 }),
          }}
        >
          <span
            style={{
              padding: "0.35em 0.9em",
              border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
              borderRadius: scales.corner(tokens.corner.pill),
              color: scene.mutedForeground,
            }}
          >
            {cta.badge}
          </span>
        </div>
      ) : null}
    </>
  );
}
