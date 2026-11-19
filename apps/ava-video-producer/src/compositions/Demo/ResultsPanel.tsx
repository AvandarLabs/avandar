import { abs } from "../../chrome/abs";
import { Orb } from "../../chrome/chrome";
import { mix } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { APP_IN, REFILTER_AT, RESULTS, ROWS, ROWS_AT, SIDE } from "./timeline";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import type { ReactNode } from "react";

/** Cues after the app arrives and the rows land, in frames. */
const CUES = { emptyState: 4, rows: 8, bar: 4, total: 20 };
/** How far each part rises as it arrives, in pixels. */
const RISE = { panel: 14, row: 10, total: 8 };
/** The panel's starting scale as it arrives. */
const PANEL_START_SCALE = 0.985;
/** How much of an excluded row stays visible: dimmed, not removed. */
const EXCLUDED_ROW_OPACITY = 0.26;

/** The results phase: an empty state that dissolves into the channel
 *  breakdown once the query runs, then dims the rows the active filter
 *  excludes. */
export function ResultsPanel({
  frame,
  totalShown,
}: {
  frame: number;
  totalShown: number;
}): ReactNode {
  return (
    <>
      <EmptyState frame={frame} />
      <Results frame={frame} totalShown={totalShown} />
    </>
  );
}

/**
 * Without this the clip spends three seconds on a near-black frame with one
 * text field in it, which reads as a broken render rather than as an app
 * waiting for input. It also gives the results something to dissolve
 * *over*: the outgoing state is still on screen underneath while the
 * incoming one fades up, so fading this out first and the panels in
 * afterwards would put a hole between them.
 */
function EmptyState({ frame }: { frame: number }): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const easing = motion.reveal.easing;
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        ...abs({
          x: RESULTS.x,
          y: RESULTS.y,
          w: SIDE.x + SIDE.w - RESULTS.x,
          h: RESULTS.h,
        }),
        borderRadius: scales.corner(semantic.corner.scene),
        border: `${scales.stroke(semantic.stroke.hairline)}px dashed ${scene.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        opacity:
          motion.ramp(frame, APP_IN + CUES.emptyState, motion.sheet, easing) *
          (1 - motion.ramp(frame, ROWS_AT, motion.chip, easing)),
      }}
    >
      <Orb size={34} />
      <div
        style={{
          fontSize: mantine.fontSizes["2xl"],
          color: scene.mutedForeground,
        }}
      >
        Results will appear here
      </div>
    </div>
  );
}

function Results({
  frame,
  totalShown,
}: {
  frame: number;
  totalShown: number;
}): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const hairline = `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.border}`;
  return (
    <div
      style={{
        ...abs(RESULTS),
        borderRadius: scales.corner(semantic.corner.scene),
        border: hairline,
        background: scene.card,
        padding: 28,
        ...motion.enter(frame, ROWS_AT, {
          dur: motion.sheet,
          y: RISE.panel,
          scale: PANEL_START_SCALE,
        }),
      }}
    >
      <div
        style={{ fontSize: mantine.fontSizes.sm, color: scene.mutedForeground }}
      >
        CHANNEL BREAKDOWN
      </div>

      {ROWS.map((row, index) => {
        return (
          <ResultRow key={row.label} frame={frame} row={row} index={index} />
        );
      })}

      {/* The list needs a bottom. A panel whose content stops halfway
       * down reads as a render that failed, not as a design. It also
       * arrives last, after the rows it is summing: a total that
       * appears before its own operands is a small lie the eye
       * catches without being able to name. */}
      <div
        style={{
          marginTop: 30,
          paddingTop: 20,
          borderTop: hairline,
          display: "flex",
          justifyContent: "space-between",
          fontSize: mantine.fontSizes["19"],
          ...motion.enter(frame, ROWS_AT + CUES.total, { y: RISE.total }),
        }}
      >
        <span style={{ color: scene.mutedForeground }}>Total</span>
        <span style={{ fontWeight: atomic.fontWeight.semibold }}>
          {totalShown.toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );
}

/** A row's bar growth and filter cut on one frame, both 0 to 1. */
function _rowProgress(
  frame: number,
  index: number,
  isPaid: boolean,
  motion: VideoMotion,
) {
  const at = ROWS_AT + CUES.rows;
  const stagger = index * motion.stagger.list;
  return {
    grow: motion.ramp(
      frame,
      at + stagger + CUES.bar,
      motion.hero,
      motion.entrance.easing,
    ),
    // 0 while the row belongs in the result, 1 once the filter has excluded
    // it, staggered by index, so the list resolves rather than blinking.
    // Same reasoning as the entrance stagger.
    cut: isPaid
      ? 0
      : motion.ramp(
          frame,
          REFILTER_AT + stagger,
          motion.sheet,
          motion.reveal.easing,
        ),
  };
}

function ResultRow({
  frame,
  row,
  index,
}: {
  frame: number;
  row: (typeof ROWS)[number];
  index: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const pill = scales.corner(semantic.corner.pill);
  // Nothing enters as a group. Two frames between siblings is the minimum
  // that reads as a list assembling rather than as a block being pasted in.
  const { grow, cut } = _rowProgress(frame, index, row.paid, motion);
  const entrance = motion.enterAt(frame, ROWS_AT + CUES.rows, index, {
    y: RISE.row,
  });
  return (
    <div
      style={{
        marginTop: 34,
        ...entrance,
        // Dimmed, not removed. A row that vanishes takes its slot with it
        // and the four below jump up a line; leaving it at a quarter says
        // "excluded" without moving anything.
        opacity:
          (entrance.opacity as number) * mix(cut, 1, EXCLUDED_ROW_OPACITY),
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: mantine.fontSizes["19"],
          marginBottom: 9,
        }}
      >
        <span>{row.label}</span>
        <span style={{ color: scene.mutedForeground }}>
          {row.n.toLocaleString("en-US")}
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: pill,
          background: semantic.color.scene.muted,
          overflow: "hidden",
        }}
      >
        {/* scaleX, not width. Width relayouts every frame; a transform
         * composites and cannot shimmer the row. */}
        <div
          style={{
            height: "100%",
            width: `${row.bar * 100}%`,
            borderRadius: pill,
            background: scene.brand,
            transformOrigin: "left center",
            transform: `scaleX(${(grow * mix(cut, 1, 0)).toFixed(4)})`,
          }}
        />
      </div>
    </div>
  );
}
