import { Freeze, Img, OffthreadVideo, staticFile } from "remotion";
import { DUR, enter, ramp } from "../motion";
import {
  assertFrame,
  assertRect,
  assertUnit,
  fitTextLines,
  safePublicPath,
  sceneBounds,
  textUnits,
} from "./layout/layout";
import { positioned, SceneShell } from "./SceneShell";
import type { MediaSceneProps } from "./scenes.types";
import type { CSSProperties } from "react";

/** Media stays stationary. Any crop is fixed for the entire scene. */
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
}: MediaSceneProps) {
  assertFrame(trimBefore, "trimBefore");
  assertUnit(objectPosition.x, "objectPosition.x");
  assertUnit(objectPosition.y, "objectPosition.y");
  assertRect(crop, "crop");
  if (kind !== "image" && kind !== "video")
    throw new Error("Media kind must be image or video");
  if (fit !== "contain" && fit !== "cover")
    throw new Error("Media fit must be contain or cover");
  const asset = staticFile(safePublicPath(src));
  sceneBounds(width, height); // Apply the shared minimum-size checks.
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
                lineHeight: 1.22,
                fontWeight: 600,
                ...enter(frame, 0, { y: 6, dur: DUR.sheet }),
              }}
            >
              {heading.lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </h1>
          ) : null}
          {subtitle ? (
            <p
              style={{
                margin: 0,
                fontSize: subtitle.fontSize,
                lineHeight: 1.22,
                textAlign: "right",
                color: "var(--muted-foreground)",
                ...enter(frame, DUR.panel, { y: 4 }),
              }}
            >
              {subtitle.lines.map((line, i) => (
                <span key={i} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </p>
          ) : null}
        </header>
      ) : null}
      <figure
        style={{
          ...positioned(bounds),
          margin: 0,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--background)",
          overflow: "hidden",
          ...enter(frame, 0, { y: 0, dur: DUR.sheet }),
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
          {kind === "image" ? (
            <Img
              src={asset}
              alt={title ?? "Captured product screen"}
              style={mediaStyle}
            />
          ) : (
            <Freeze frame={Math.max(0, Math.floor(frame))}>
              <OffthreadVideo
                src={asset}
                trimBefore={trimBefore}
                muted
                style={mediaStyle}
              />
            </Freeze>
          )}
        </div>
        {callouts.map((callout) => {
          if (frame < callout.startFrame || frame >= callout.endFrame)
            return null;
          const duration = Math.min(
            DUR.chip,
            (callout.endFrame - callout.startFrame) / 3,
          );
          const opacity =
            ramp(frame, callout.startFrame, duration) *
            (1 - ramp(frame, callout.endFrame - duration, duration));
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
          const labelHeight = label.lines.length * label.fontSize * 1.22 + 20;
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
                  border: "3px solid var(--brand-strong)",
                  borderRadius: 8,
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
                  lineHeight: 1.22,
                  fontWeight: 500,
                  color: "var(--foreground)",
                  background: "var(--ground)",
                  border: "1px solid var(--brand-strong)",
                  borderRadius: 8,
                }}
              >
                {label.lines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          );
        })}
      </figure>
    </SceneShell>
  );
}
