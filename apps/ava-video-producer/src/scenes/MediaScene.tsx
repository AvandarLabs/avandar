import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../videoTheme/useVideoTheme";
import {
  assertFrame,
  assertRect,
  assertUnit,
  fitTextLines,
  sceneBounds,
  textUnits,
} from "./layout/layout";
import { MediaPlane } from "./MediaPlane";
import { positioned } from "./positioned";
import { SceneShell } from "./SceneShell";
import { getStageTextStyle } from "./stageTheme/stageTheme";
import type { MediaSceneProps } from "./scenes.types";
import type { CSSProperties, ReactNode } from "react";

/** How far the heading rises as it arrives, in pixels. */
const HEADING_RISE = 6;
/** How far the subtitle rises as it arrives, in pixels. */
const SUBTITLE_RISE = 4;

/**
 * Media stays stationary. Any crop is fixed for the entire scene. The
 * heading is `text.stage.cardTitle` at its fitted size, callouts are
 * `text.stage.caption` labels with emphasis outlines in the strong brand
 * colour.
 */
export function MediaScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  kind,
  src,
  trimBefore = 0,
  fit = "contain",
  objectPosition = { x: 0.5, y: 0.5 },
  crop = { x: 0, y: 0, width: 1, height: 1 },
  callouts = [],
}: MediaSceneProps): ReactNode {
  assertFrame(trimBefore, "trimBefore");
  assertUnit(objectPosition.x, "objectPosition.x");
  assertUnit(objectPosition.y, "objectPosition.y");
  assertRect(crop, "crop");
  if (kind !== "image" && kind !== "video")
    throw new Error("Media kind must be image or video");
  if (fit !== "contain" && fit !== "cover")
    throw new Error("Media fit must be contain or cover");
  sceneBounds(width, height); // Apply the shared minimum-size checks.
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  const cardTitle = tokens.text.stage.cardTitle;
  const caption = tokens.text.stage.caption;
  const captionLineHeight = caption.lineHeight ?? 1;
  const top = title || kicker ? 92 : 24;
  const bounds = {
    x: 24,
    y: top,
    width: width - 48,
    height: height - top - 24,
  };
  const heading = title
    ? fitTextLines([title], width * 0.57, 54, 36, 28)
    : undefined;
  const subtitle = kicker
    ? fitTextLines([kicker], width * 0.38, 54, 24, 18)
    : undefined;
  const ids = new Set<string>();
  callouts.forEach((callout) => {
    assertRect(callout, `callout ${callout.id}`);
    assertFrame(callout.startFrame, "callout.startFrame");
    assertFrame(callout.endFrame, "callout.endFrame");
    if (
      !callout.id ||
      ids.has(callout.id) ||
      !callout.label.trim() ||
      callout.endFrame <= callout.startFrame
    )
      throw new Error(`Invalid or duplicate media callout: ${callout.id}`);
    ids.add(callout.id);
  });
  const mediaStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: fit,
    objectPosition: `${objectPosition.x * 100}% ${objectPosition.y * 100}%`,
  };
  return (
    <SceneShell {...{ frame, width, height }}>
      {heading || subtitle ? (
        <header
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            top: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {heading ? (
            <h1
              style={{
                margin: 0,
                fontSize: heading.fontSize,
                ...getStageTextStyle(cardTitle, ["lineHeight", "fontWeight"]),
                ...motion.enter(frame, 0, {
                  y: HEADING_RISE,
                  dur: motion.sheet,
                }),
              }}
            >
              {heading.lines.map((line, i) => {
                return <div key={i}>{line}</div>;
              })}
            </h1>
          ) : null}
          {subtitle ? (
            <p
              style={{
                margin: 0,
                fontSize: subtitle.fontSize,
                lineHeight: cardTitle.lineHeight,
                textAlign: "right",
                color: scene.mutedForeground,
                ...motion.enter(frame, motion.panel, { y: SUBTITLE_RISE }),
              }}
            >
              {subtitle.lines.map((line, i) => {
                return (
                  <span key={i} style={{ display: "block" }}>
                    {line}
                  </span>
                );
              })}
            </p>
          ) : null}
        </header>
      ) : null}
      <figure
        style={{
          ...positioned(bounds),
          margin: 0,
          border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
          borderRadius: scales.corner(tokens.corner.scene),
          background: scene.background,
          overflow: "hidden",
          ...motion.enter(frame, 0, { y: 0, dur: motion.sheet }),
        }}
      >
        <div
          style={{
            position: "absolute",
            width: bounds.width,
            height: bounds.height,
            transformOrigin: "0 0",
            transform: `translate(${(-crop.x / crop.width) * bounds.width}px, ${(-crop.y / crop.height) * bounds.height}px) scale(${1 / crop.width}, ${1 / crop.height})`,
          }}
        >
          <MediaPlane
            frame={frame}
            kind={kind}
            src={src}
            trimBefore={trimBefore}
            alt={title ?? "Captured product screen"}
            style={mediaStyle}
          />
        </div>
        {callouts.map((callout) => {
          if (frame < callout.startFrame || frame >= callout.endFrame)
            return null;
          const duration = Math.min(
            motion.chip,
            (callout.endFrame - callout.startFrame) / 3,
          );
          const fade = motion.reveal.easing;
          const opacity =
            motion.ramp(frame, callout.startFrame, duration, fade) *
            (1 -
              motion.ramp(frame, callout.endFrame - duration, duration, fade));
          const labelWidth = Math.min(
            bounds.width - 32,
            Math.max(160, Math.min(460, textUnits(callout.label) * 22 + 32)),
          );
          const label = fitTextLines(
            [callout.label],
            labelWidth - 32,
            72,
            22,
            18,
          );
          const labelHeight =
            label.lines.length * label.fontSize * captionLineHeight + 20;
          const labelX = Math.max(
            8,
            Math.min(bounds.width - labelWidth - 8, callout.x * bounds.width),
          );
          const targetY = callout.y * bounds.height;
          const labelY =
            targetY >= labelHeight + 12
              ? targetY - labelHeight - 8
              : Math.min(bounds.height - labelHeight - 8, targetY + 8);
          return (
            <div
              key={callout.id}
              style={{ position: "absolute", inset: 0, opacity }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${callout.x * 100}%`,
                  top: `${callout.y * 100}%`,
                  width: `${callout.width * 100}%`,
                  height: `${callout.height * 100}%`,
                  border: `${scales.stroke(tokens.stroke.emphasis)}px solid ${scene.brandStrong}`,
                  borderRadius: scales.corner(tokens.corner.cell),
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: labelX,
                  top: labelY,
                  width: labelWidth,
                  padding: "10px 16px",
                  fontSize: label.fontSize,
                  ...getStageTextStyle(caption, ["lineHeight", "fontWeight"]),
                  color: scene.foreground,
                  background: scene.ground,
                  border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.brandStrong}`,
                  borderRadius: scales.corner(tokens.corner.cell),
                }}
              >
                {label.lines.map((line, i) => {
                  return <div key={i}>{line}</div>;
                })}
              </div>
            </div>
          );
        })}
      </figure>
    </SceneShell>
  );
}
