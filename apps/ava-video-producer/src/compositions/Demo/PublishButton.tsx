import { abs } from "../../chrome/chrome";
import { DUR, enter, press } from "../../motion";
import { PUBLISH, PUBLISH_CLICK, ROWS_AT } from "./timeline";

/** The publish phase: the button entering with the side panel, then
 *  answering the click that sends the report. */
export function PublishButton({ frame }: { frame: number }) {
  const publishIn = enter(frame, ROWS_AT + 10, { dur: DUR.panel, y: 10 });
  return (
    <div
      style={{
        ...abs(PUBLISH),
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        fontWeight: 600,
        color: "white",
        background: "var(--brand)",
        ...publishIn,
        // Two transforms on one element: compose them into one string,
        // never spread one over the other. The spread would silently
        // drop whichever came first, and the entrance would vanish for
        // the eight frames the press is active.
        transform: `${publishIn.transform} scale(${press(frame, PUBLISH_CLICK).toFixed(4)})`,
      }}
    >
      Publish report
    </div>
  );
}
