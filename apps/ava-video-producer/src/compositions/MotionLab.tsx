import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AppFrame, Cursor } from "../chrome/chrome";
import { MOTION_LAB_LEN } from "../composition-timing";
import { TYPE } from "../fonts";
import { countTo, enterAt, mixToken, press, ramp, typed } from "../motion";

export { MOTION_LAB_LEN } from "../composition-timing";

/* ------------------------------------------------------------ beat sheet -- */
const APP_IN = 0;
const ROWS_AT = 18;
const TYPE_AT = 68;
const COUNT_AT = 122;
const CLICK_AT = 192;
const OUT_AT = 260;

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

export function MotionLab() {
  const frame = useCurrentFrame();
  const visibility = Math.min(
    ramp(frame, APP_IN, 14),
    1 - ramp(frame, OUT_AT, 20),
  );
  const active = ramp(frame, CLICK_AT, 6);
  const panel = {
    position: "absolute" as const,
    border: "1px solid var(--border)",
    borderRadius: 18,
    background: "var(--card)",
  };
  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      <AbsoluteFill
        style={{
          opacity: visibility,
          background: "var(--background)",
          fontFamily: TYPE,
          color: "var(--foreground)",
        }}
      >
        <AppFrame
          w={1600}
          title="Starter / motion studies"
          heading="Motion vocabulary"
          sub="The same helpers that power the original demo"
        />
        <div
          style={{
            position: "absolute",
            top: 158,
            left: 60,
            fontSize: 16,
            letterSpacing: 2,
            color: "var(--muted-foreground)",
          }}
        >
          FOUR BUILDING BLOCKS
        </div>
        {ITEMS.map(([number, title, detail], index) => (
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
              ...enterAt(frame, ROWS_AT, index, { y: 12, dur: 12 }),
            }}
          >
            <span style={{ fontSize: 24, color: "var(--brand-strong)" }}>
              {number}
            </span>
            <div>
              <div style={{ fontSize: 25, fontWeight: 600, marginBottom: 10 }}>
                {title}
              </div>
              <div style={{ fontSize: 18, color: "var(--muted-foreground)" }}>
                {detail}
              </div>
            </div>
          </div>
        ))}
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
          <div
            style={{
              fontSize: 16,
              letterSpacing: 2,
              color: "var(--muted-foreground)",
            }}
          >
            TYPE A THOUGHT
          </div>
          <div style={{ marginTop: 38, fontSize: 30 }}>
            {typed(frame, TYPE_AT, "Ask a question. Show the answer.")}
          </div>
        </div>
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
          <div
            style={{
              fontSize: 16,
              letterSpacing: 2,
              color: "var(--muted-foreground)",
            }}
          >
            COUNT TOWARD A RESULT
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 108,
              lineHeight: 1.15,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -4,
            }}
          >
            {countTo(frame, COUNT_AT, 1940, 36).toLocaleString("en-US")}
          </div>
          <div
            style={{
              marginTop: 22,
              height: 5,
              background: "var(--muted)",
              borderRadius: 3,
            }}
          >
            <div
              style={{
                height: 5,
                width: `${ramp(frame, COUNT_AT, 36) * 100}%`,
                background: "var(--brand)",
                borderRadius: 3,
              }}
            />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 804,
            top: 800,
            fontSize: 17,
            color: "var(--muted-foreground)",
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
            borderRadius: 12,
            background: mixToken(active, "var(--brand)", "var(--brand-soft)"),
            border: "1px solid var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 25,
            fontWeight: 600,
            transform: `scale(${press(frame, CLICK_AT)})`,
          }}
        >
          Preview motion
        </div>
        <div
          style={{
            position: "absolute",
            left: 810,
            top: 866,
            fontSize: 20,
            color: "var(--brand-strong)",
            opacity: active,
          }}
        >
          ✓ Motion previewed
        </div>
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
