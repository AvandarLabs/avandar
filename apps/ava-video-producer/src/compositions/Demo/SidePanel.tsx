import { abs } from "../../chrome/abs";
import { Orb } from "../../chrome/chrome";
import { mix, mixToken } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import {
  CHIP_CLICK,
  CHIPS,
  LIT_CHIP,
  ROWS_AT,
  SIDE,
  TOAST_AT,
} from "./timeline";
import type { ReactNode } from "react";

/** Cues after the rows land, in frames. */
const CUES = { panel: 4, facts: 16 };
/** How far each part rises as it arrives, in pixels. */
const RISE = { panel: 14, fact: 8, toast: 16 };
/** The panel's starting scale as it arrives. */
const PANEL_START_SCALE = 0.985;
/** The lit chip presses half as deep again as a button. */
const CHIP_PRESS_SCALE = 1.5;

/** The side panel phase: the matched-rows counter, the filter chips, a pair
 *  of supporting facts, and the publish toast that lands once the report
 *  is shared. */
export function SidePanel({
  frame,
  shown,
  refilter,
  chipOn,
}: {
  frame: number;
  shown: number;
  refilter: number;
  chipOn: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        ...abs(SIDE),
        // No corner token holds the starter 14 px radius yet.
        borderRadius: "var(--radius)",
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.border}`,
        background: scene.card,
        padding: 28,
        ...motion.enter(frame, ROWS_AT + CUES.panel, {
          dur: motion.sheet,
          y: RISE.panel,
          scale: PANEL_START_SCALE,
        }),
      }}
    >
      <div
        style={{ fontSize: mantine.fontSizes.sm, color: scene.mutedForeground }}
      >
        ROWS MATCHED
      </div>
      <MatchedCount shown={shown} />
      <FilterChips frame={frame} chipOn={chipOn} />
      <Facts frame={frame} refilter={refilter} />
      <PublishedToast frame={frame} />
    </div>
  );
}

function MatchedCount({ shown }: { shown: number }): ReactNode {
  const { atomic } = useVideoTheme();
  return (
    <div
      style={{
        // No size step or figure role holds the 76 px counter and its
        // -2 px tracking yet.
        fontSize: 76,
        fontWeight: atomic.fontWeight.bold,
        letterSpacing: -2,
        marginTop: 6,
        // Weight and size stay stepped. Tweening fontSize reflows the
        // line every frame; this number changes its value, not its type.
      }}
    >
      {shown.toLocaleString("en-US")}
    </div>
  );
}

function FilterChips({
  frame,
  chipOn,
}: {
  frame: number;
  chipOn: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const chipPress = motion.press(
    frame,
    CHIP_CLICK,
    motion.pressDepth * CHIP_PRESS_SCALE,
  );
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 30, flexWrap: "wrap" }}>
      {CHIPS.map((chip, index) => {
        // A filter group always has exactly one selection. "All channels"
        // is lit from the start and hands over to "Paid only" on the same
        // ramp: three inert chips are a control in no state at all, which
        // no real UI ever shows.
        const lit =
          index === 0 ? 1 - chipOn : index === LIT_CHIP ? chipOn : 0;
        return (
          <div
            key={chip}
            style={{
              padding: "10px 18px",
              borderRadius: scales.corner(semantic.corner.pill),
              fontSize: mantine.fontSizes.lg,
              border: `${scales.stroke(semantic.stroke.hairline)}px solid ${mixToken(lit, scene.border, scene.brand)}`,
              background: mixToken(lit, "transparent", scene.brandSoft),
              color: mixToken(lit, scene.mutedForeground, scene.brandStrong),
              transform: `scale(${(index === LIT_CHIP ? chipPress : 1).toFixed(4)})`,
            }}
          >
            {chip}
          </div>
        );
      })}
    </div>
  );
}

function Facts({
  frame,
  refilter,
}: {
  frame: number;
  refilter: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const facts: Array<[string, ReactNode]> = [
    [
      "Top channel",
      // Text cannot tween, so the two states cross-fade in place rather
      // than swapping on a single frame. The incoming label is an
      // absolutely-positioned overlay: opacity only, nothing here can
      // reflow the row it sits in.
      <span style={{ position: "relative", display: "inline-block" }}>
        <span style={{ opacity: 1 - refilter }}>Organic search</span>
        <span
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            whiteSpace: "nowrap",
            opacity: refilter,
          }}
        >
          Paid social
        </span>
      </span>,
    ],
    ["Period", "Q3 2026"],
  ];
  return facts.map(([name, value], index) => {
    return (
      <div
        key={name}
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: mantine.fontSizes.lg,
          marginTop: 20,
          paddingTop: 20,
          borderTop: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.border}`,
          ...motion.enterAt(frame, ROWS_AT + CUES.facts, index, {
            y: RISE.fact,
          }),
        }}
      >
        <span style={{ color: scene.mutedForeground }}>{name}</span>
        <span>{value}</span>
      </div>
    );
  });
}

/**
 * The hero beat of the last phase. One per phase: if everything is
 * animated, nothing reads as animated. A spring, because this lands in a
 * slot rather than travelling.
 */
function PublishedToast({ frame }: { frame: number }): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        marginTop: 34,
        padding: 22,
        borderRadius: scales.corner(semantic.corner.card),
        background: scene.brandSoft,
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.brand}`,
        display: "flex",
        gap: 14,
        alignItems: "center",
        opacity: motion.ramp(frame, TOAST_AT, motion.chip, motion.reveal.easing),
        transform: `translateY(${mix(motion.pop(frame, TOAST_AT), RISE.toast, 0).toFixed(2)}px)`,
      }}
    >
      <Orb size={22} />
      <div>
        <div
          style={{
            fontSize: mantine.fontSizes.xl,
            fontWeight: atomic.fontWeight.semibold,
          }}
        >
          Report published
        </div>
        <div
          style={{
            fontSize: mantine.fontSizes.sm,
            color: scene.mutedForeground,
          }}
        >
          Shared with 4 people
        </div>
      </div>
    </div>
  );
}
