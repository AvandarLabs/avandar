// Registers the bundled faces the theme's text roles name.
import "../fonts";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AppFrame, Cursor } from "../chrome/chrome";
import { MOTION_LAB_LEN } from "../composition-timing";
import { mix, mixToken, typed } from "../motion";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../videoTheme/useVideoTheme";
import type { CSSProperties, ReactNode } from "react";

export { MOTION_LAB_LEN } from "../composition-timing";

/* ------------------------------------------------------------ beat sheet -- */
const APP_IN = 0;
const ROWS_AT = 18;
const TYPE_AT = 68;
const COUNT_AT = 122;
const CLICK_AT = 192;
const OUT_AT = 260;

/** Animation lengths with no shared token, in frames at tempo 1. */
const FRAMES = { appIn: 14, appOut: 20, count: 36 };
/** The figure the counter lands on. */
const COUNT_TO = 1940;

const ITEMS = [
  ["01", "Staggered entrances", "Each row arrives in its own time."],
  ["02", "Typed text", "A sentence builds character by character."],
  ["03", "Animated counters", "A value travels toward its final number."],
  ["04", "Pointer choreography", "Arrive, pause, press, then hold."],
];
const POINTER = [
  { at: 0, x: 1480, y: 750 },
  { at: 160, x: 1480, y: 750 },
  { at: 180, x: 1260, y: 861 },
  { at: MOTION_LAB_LEN, x: 1260, y: 861 },
];

/** The panel every card in the study sits in: scene card, border, corner. */
function usePanelStyle(): CSSProperties {
  const { semantic } = useVideoTheme();
  const scales = useVideoShapeScales();
  return {
    position: "absolute",
    border: `${scales.stroke(semantic.stroke.hairline)}px solid ${semantic.color.scene.border}`,
    borderRadius: scales.corner(semantic.corner.panel),
    background: semantic.color.scene.card,
  };
}

/** The tracked capitals that head each part of the study. */
function SectionLabel({
  style,
  children,
}: {
  style?: CSSProperties;
  children: ReactNode;
}): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  return (
    <div
      style={{
        ...style,
        fontSize: mantine.fontSizes.md,
        letterSpacing: `${atomic.letterSpacing.capitals}em`,
        color: semantic.color.scene.mutedForeground,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Four building blocks of the motion vocabulary, drawn in the video theme:
 * the scene palette, theme type steps, corners and strokes through the
 * Look and feel scales, and themed motion. Draw it inside a theme.
 */
export function MotionLab(): ReactNode {
  const frame = useCurrentFrame();
  const { semantic } = useVideoTheme();
  const motion = useVideoMotion();
  const scene = semantic.color.scene;
  const easing = motion.entrance.easing;
  const visibility = Math.min(
    motion.ramp(frame, APP_IN, motion.scale(FRAMES.appIn), easing),
    1 - motion.ramp(frame, OUT_AT, motion.scale(FRAMES.appOut), easing),
  );
  return (
    <AbsoluteFill style={{ background: scene.ground }}>
      <AbsoluteFill
        style={{
          opacity: visibility,
          background: scene.background,
          fontFamily: semantic.text.stage.appBody.fontFamily,
          color: scene.foreground,
        }}
      >
        <AppFrame
          w={1600}
          title="Starter / motion studies"
          heading="Motion vocabulary"
          sub="The same helpers that power the original demo"
        />
        <SectionLabel style={{ position: "absolute", top: 158, left: 60 }}>
          FOUR BUILDING BLOCKS
        </SectionLabel>
        <BuildingBlocks frame={frame} />
        <TypedCard frame={frame} />
        <CounterCard frame={frame} />
        <ClickStudy frame={frame} />
        <Cursor
          frame={frame}
          path={POINTER}
          clicks={[CLICK_AT]}
          cursor={frame >= 180 ? "pointer" : "default"}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function BuildingBlocks({ frame }: { frame: number }): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  const panel = usePanelStyle();
  const scene = semantic.color.scene;
  return ITEMS.map(([number, title, detail], index) => {
    return (
      <div
        key={number}
        style={{
          ...panel,
          left: 60,
          top: 212 + index * 170,
          width: 704,
          height: 146,
          padding: 28,
          display: "flex",
          alignItems: "center",
          gap: 26,
          ...motion.enterAt(frame, ROWS_AT, index, {
            y: motion.entrance.distance,
            dur: motion.reveal.duration,
          }),
        }}
      >
        <span
          style={{
            fontSize: mantine.fontSizes["6xl"],
            color: scene.brandStrong,
          }}
        >
          {number}
        </span>
        <div>
          <div
            style={{
              fontSize: mantine.fontSizes["7xl"],
              fontWeight: atomic.fontWeight.semibold,
              marginBottom: 10,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: mantine.fontSizes.xl,
              color: scene.mutedForeground,
            }}
          >
            {detail}
          </div>
        </div>
      </div>
    );
  });
}

function TypedCard({ frame }: { frame: number }): ReactNode {
  const { mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const panel = usePanelStyle();
  return (
    <div
      style={{
        ...panel,
        left: 804,
        top: 212,
        width: 736,
        height: 204,
        padding: 32,
      }}
    >
      <SectionLabel>TYPE A THOUGHT</SectionLabel>
      <div style={{ marginTop: 38, fontSize: mantine.fontSizes["8xl"] }}>
        {typed(
          frame,
          TYPE_AT,
          "Ask a question. Show the answer.",
          motion.typing.rate,
        )}
      </div>
    </div>
  );
}

function CounterCard({ frame }: { frame: number }): ReactNode {
  const { semantic, atomic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const panel = usePanelStyle();
  const scene = semantic.color.scene;
  const pill = scales.corner(semantic.corner.pill);
  const progress = motion.ramp(
    frame,
    COUNT_AT,
    motion.scale(FRAMES.count),
    motion.reveal.easing,
  );
  return (
    <div
      style={{
        ...panel,
        left: 804,
        top: 444,
        width: 736,
        height: 300,
        padding: 32,
      }}
    >
      <SectionLabel>COUNT TOWARD A RESULT</SectionLabel>
      <div
        style={{
          marginTop: 18,
          fontSize: mantine.fontSizes["108"],
          lineHeight: mantine.lineHeights["115"],
          fontWeight: atomic.fontWeight.semibold,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: `${atomic.letterSpacing.largeCounter}em`,
        }}
      >
        {Math.round(mix(progress, 0, COUNT_TO)).toLocaleString("en-US")}
      </div>
      <div
        style={{
          marginTop: 22,
          height: 5,
          background: semantic.color.scene.muted,
          borderRadius: pill,
        }}
      >
        <div
          style={{
            height: 5,
            width: `${progress * 100}%`,
            background: scene.brand,
            borderRadius: pill,
          }}
        />
      </div>
    </div>
  );
}

function ClickStudy({ frame }: { frame: number }): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const active = motion.ramp(
    frame,
    CLICK_AT,
    motion.chip,
    motion.reveal.easing,
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 804,
          top: 800,
          fontSize: mantine.fontSizes.lg,
          color: scene.mutedForeground,
        }}
      >
        A click gets a visible response.
      </div>
      <div
        style={{
          position: "absolute",
          left: 1110,
          top: 824,
          width: 340,
          height: 74,
          borderRadius: scales.corner(semantic.corner.card),
          background: mixToken(active, scene.brand, scene.brandSoft),
          border: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.brand}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: mantine.fontSizes["7xl"],
          fontWeight: atomic.fontWeight.semibold,
          transform: `scale(${motion.press(frame, CLICK_AT)})`,
        }}
      >
        Preview motion
      </div>
      <div
        style={{
          position: "absolute",
          left: 810,
          top: 866,
          fontSize: mantine.fontSizes["2xl"],
          color: scene.brandStrong,
          opacity: active,
        }}
      >
        ✓ Motion previewed
      </div>
    </>
  );
}
