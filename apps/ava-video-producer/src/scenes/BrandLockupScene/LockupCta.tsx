import { typed } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { getStageTextStyle } from "../stageTheme/stageTheme";
import { getCtaBeats } from "./brandLockupMotion";
import type { BrandLockupSceneProps } from "../scenes.types";
import type { CSSProperties, ReactNode } from "react";

/** Default command typing speed, about one character per frame. */
const COMMAND_CHARS_PER_SECOND = 30;

type CtaBeats = ReturnType<typeof getCtaBeats>;

/** The canvas a CTA line is centred on, and the line height it sets. */
type CtaLineBox = Readonly<{
  width: number;
  height: number;
  lineHeight?: number;
}>;

/** One centred CTA line at a fraction of the canvas height. */
function _buildCtaLineStyle(
  box: CtaLineBox,
  top: number,
  fontSize: number,
): CSSProperties {
  return {
    position: "absolute",
    left: box.width * 0.1,
    width: box.width * 0.8,
    top: box.height * top,
    textAlign: "center",
    fontSize,
    lineHeight: box.lineHeight,
    whiteSpace: "nowrap",
  };
}

/** Subtitle, URL, typed command and badge, cascading in below the mark. */
export function LockupCta({
  frame,
  cta,
  width,
  height,
}: {
  frame: number;
  cta: NonNullable<BrandLockupSceneProps["cta"]>;
  width: number;
  height: number;
}): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  const badge = tokens.text.stage.badge;
  const cps = cta.commandCharsPerSecond ?? COMMAND_CHARS_PER_SECOND;
  const beats = getCtaBeats(cta, cps, motion);
  const box = { width, height, lineHeight: badge.lineHeight };
  return (
    <>
      {cta.subtitle ? (
        <CtaSubtitle {...{ frame, box, beats }} subtitle={cta.subtitle} />
      ) : null}
      {cta.url ? (
        <div
          style={{
            ..._buildCtaLineStyle(box, 0.54, height * 0.09),
            ...getStageTextStyle(badge, ["fontWeight"]),
            ...motion.enter(frame, beats.urlAt, { y: 0 }),
          }}
        >
          {cta.url}
        </div>
      ) : null}
      {cta.command ? (
        <CtaCommand {...{ frame, box, beats, cps }} command={cta.command} />
      ) : null}
      {cta.badge ? (
        <CtaBadge {...{ frame, box, beats }} badge={cta.badge} />
      ) : null}
    </>
  );
}

function CtaSubtitle({
  frame,
  box,
  beats,
  subtitle,
}: Readonly<{
  frame: number;
  box: CtaLineBox;
  beats: CtaBeats;
  subtitle: string;
}>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  return (
    <div
      style={{
        ..._buildCtaLineStyle(box, 0.43, box.height * 0.042),
        color: tokens.color.scene.mutedForeground,
        ...motion.enter(frame, beats.subtitleAt, { y: 0 }),
      }}
    >
      {subtitle}
    </div>
  );
}

/** The command, typed after its prompt, with a caret lit while typing. */
function CtaCommand({
  frame,
  box,
  beats,
  cps,
  command,
}: Readonly<{
  frame: number;
  box: CtaLineBox;
  beats: CtaBeats;
  cps: number;
  command: string;
}>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  const scene = tokens.color.scene;
  const isTyping = frame >= beats.typingAt && frame < beats.typingEnd;
  return (
    <div
      style={{
        ..._buildCtaLineStyle(box, 0.735, box.height * 0.03),
        fontFamily: tokens.text.stage.command.fontFamily,
        opacity: frame >= beats.promptAt ? 1 : 0,
      }}
    >
      <span style={{ color: scene.mutedForeground }}>$ </span>
      {typed(frame, beats.typingAt, command, cps)}
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
  );
}

/** The outlined badge, arriving last. */
function CtaBadge({
  frame,
  box,
  beats,
  badge,
}: Readonly<{
  frame: number;
  box: CtaLineBox;
  beats: CtaBeats;
  badge: string;
}>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  return (
    <div
      style={{
        ..._buildCtaLineStyle(box, 0.86, box.height * 0.022),
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
        {badge}
      </span>
    </div>
  );
}
