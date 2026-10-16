import { abs, Orb } from "../../chrome/chrome";
import { DUR, EASE, enter, enterAt, mix, ramp } from "../../motion";
import { APP_IN, REFILTER_AT, RESULTS, ROWS, ROWS_AT, SIDE } from "./timeline";

/** The results phase: an empty state that dissolves into the channel
 *  breakdown once the query runs, then dims the rows the active filter
 *  excludes. */
export function ResultsPanel({
  frame,
  totalShown,
}: {
  frame: number;
  totalShown: number;
}) {
  return (
    <>
      {/* Without this the clip spends three seconds on a near-black frame
       * with one text field in it, which reads as a broken render rather
       * than as an app waiting for input. It also gives the results
       * something to dissolve *over*: the outgoing state is still on
       * screen underneath while the incoming one fades up, so fading
       * this out first and the panels in afterwards would put a hole
       * between them. */}
      <div
        style={{
          ...abs({
            x: RESULTS.x,
            y: RESULTS.y,
            w: SIDE.x + SIDE.w - RESULTS.x,
            h: RESULTS.h,
          }),
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          opacity:
            ramp(frame, APP_IN + 4, DUR.sheet) *
            (1 - ramp(frame, ROWS_AT, DUR.chip)),
        }}
      >
        <Orb size={34} />
        <div style={{ fontSize: 20, color: "var(--muted-foreground)" }}>
          Results will appear here
        </div>
      </div>

      {/* --------------------------------------------------- the results */}
      <div
        style={{
          ...abs(RESULTS),
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: 28,
          ...enter(frame, ROWS_AT, { dur: DUR.sheet, y: 14, scale: 0.985 }),
        }}
      >
        <div style={{ fontSize: 15, color: "var(--muted-foreground)" }}>
          CHANNEL BREAKDOWN
        </div>

        {ROWS.map((row, i) => {
          // Nothing enters as a group. Two frames between siblings is the
          // minimum that reads as a list assembling rather than as a
          // block being pasted in.
          const at = ROWS_AT + 8;
          const grow = ramp(frame, at + i * 2 + 4, DUR.hero, EASE.out);
          // 0 while the row belongs in the result, 1 once the filter has
          // excluded it, staggered by index, so the list resolves rather
          // than blinking. Same reasoning as the entrance stagger.
          const cut = row.paid
            ? 0
            : ramp(frame, REFILTER_AT + i * 2, DUR.sheet, EASE.out);
          const ent = enterAt(frame, at, i, { y: 10 });
          return (
            <div
              key={row.label}
              style={{
                marginTop: 34,
                ...ent,
                // Dimmed, not removed. A row that vanishes takes its slot
                // with it and the four below jump up a line; leaving it at
                // a quarter says "excluded" without moving anything.
                opacity: (ent.opacity as number) * mix(cut, 1, 0.26),
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 19,
                  marginBottom: 9,
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {row.n.toLocaleString("en-US")}
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 99,
                  background: "var(--muted)",
                  overflow: "hidden",
                }}
              >
                {/* scaleX, not width. Width relayouts every frame; a
                 * transform composites and cannot shimmer the row. */}
                <div
                  style={{
                    height: "100%",
                    width: `${row.bar * 100}%`,
                    borderRadius: 99,
                    background: "var(--brand)",
                    transformOrigin: "left center",
                    transform: `scaleX(${(grow * mix(cut, 1, 0)).toFixed(4)})`,
                  }}
                />
              </div>
            </div>
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
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 19,
            ...enter(frame, ROWS_AT + 20, { y: 8 }),
          }}
        >
          <span style={{ color: "var(--muted-foreground)" }}>Total</span>
          <span style={{ fontWeight: 600 }}>
            {totalShown.toLocaleString("en-US")}
          </span>
        </div>
      </div>
    </>
  );
}
