import type { ReactNode } from "react";
import { abs, Orb } from "../../chrome/chrome";
import { DUR, enter, enterAt, mix, mixToken, pop, press, ramp } from "../../motion";
import { CHIP_CLICK, CHIPS, LIT_CHIP, ROWS_AT, SIDE, TOAST_AT } from "./timeline";

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
}) {
  return (
    <div
      style={{
        ...abs(SIDE),
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: 28,
        ...enter(frame, ROWS_AT + 4, {
          dur: DUR.sheet,
          y: 14,
          scale: 0.985,
        }),
      }}
    >
      <div style={{ fontSize: 15, color: "var(--muted-foreground)" }}>
        ROWS MATCHED
      </div>
      <div
        style={{
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: -2,
          marginTop: 6,
          // Weight and size stay stepped. Tweening fontSize reflows the
          // line every frame; this number changes its value, not its type.
        }}
      >
        {shown.toLocaleString("en-US")}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 30,
          flexWrap: "wrap",
        }}
      >
        {CHIPS.map((chip, i) => {
          // A filter group always has exactly one selection. "All
          // channels" is lit from the start and hands over to "Paid
          // only" on the same ramp: three inert chips are a control in
          // no state at all, which no real UI ever shows.
          const lit = i === 0 ? 1 - chipOn : i === LIT_CHIP ? chipOn : 0;
          return (
            <div
              key={chip}
              style={{
                padding: "10px 18px",
                borderRadius: 99,
                fontSize: 17,
                border: `1px solid ${mixToken(lit, "var(--border)", "var(--brand)")}`,
                background: mixToken(lit, "transparent", "var(--brand-soft)"),
                color: mixToken(
                  lit,
                  "var(--muted-foreground)",
                  "var(--brand-strong)",
                ),
                transform: `scale(${(i === LIT_CHIP ? press(frame, CHIP_CLICK, 0.06) : 1).toFixed(4)})`,
              }}
            >
              {chip}
            </div>
          );
        })}
      </div>

      {(
        [
          [
            "Top channel",
            // Text cannot tween, so the two states cross-fade in place
            // rather than swapping on a single frame. The incoming label
            // is an absolutely-positioned overlay: opacity only, nothing
            // here can reflow the row it sits in.
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
        ] as Array<[string, ReactNode]>
      ).map(([k, v], i) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 17,
            marginTop: 20,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            ...enterAt(frame, ROWS_AT + 16, i, { y: 8 }),
          }}
        >
          <span style={{ color: "var(--muted-foreground)" }}>{k}</span>
          <span>{v}</span>
        </div>
      ))}

      {/* The hero beat of the last phase. One per phase: if everything
       * is animated, nothing reads as animated. A spring, because this
       * lands in a slot rather than travelling. */}
      <div
        style={{
          marginTop: 34,
          padding: 22,
          borderRadius: 12,
          background: "var(--brand-soft)",
          border: "1px solid var(--brand)",
          display: "flex",
          gap: 14,
          alignItems: "center",
          opacity: ramp(frame, TOAST_AT, DUR.chip),
          transform: `translateY(${mix(pop(frame, TOAST_AT), 16, 0).toFixed(2)}px)`,
        }}
      >
        <Orb size={22} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Report published</div>
          <div style={{ fontSize: 15, color: "var(--muted-foreground)" }}>
            Shared with 4 people
          </div>
        </div>
      </div>
    </div>
  );
}
