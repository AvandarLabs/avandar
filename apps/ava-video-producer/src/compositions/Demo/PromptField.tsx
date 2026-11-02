import { abs } from "../../chrome/chrome";
import { caretOn, mixToken, press } from "../../motion";
import { FIELD, RUN_CLICK } from "./timeline";

/** The prompt field phase: a text field gaining focus, filling with the
 *  query, and a Run button answering the click. */
export function PromptField({
  frame,
  focus,
  text,
  typing,
}: {
  frame: number;
  focus: number;
  text: string;
  typing: boolean;
}) {
  return (
    <div
      style={{
        ...abs(FIELD),
        borderRadius: "var(--radius)",
        background: "var(--card)",
        // The single most common defect this kit exists to prevent:
        // `focused ? "var(--brand)" : "var(--border)"`. That is a
        // one-frame teleport. Anchor a ramp at the frame the state
        // changes and blend the two tokens through it.
        border: `1px solid ${mixToken(focus, "var(--border)", "var(--brand)")}`,
        boxShadow: `0 0 0 ${(focus * 3).toFixed(1)}px var(--brand-soft)`,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 2,
      }}
    >
      <span style={{ fontSize: 24, opacity: text ? 1 : 0.45 }}>
        {text || "Ask for anything"}
      </span>
      {/* A caret only while something is actually being typed. Static
       * copy in a field the flow claims is being filled reads as a
       * screenshot, and the viewer clocks it immediately. */}
      <span
        style={{
          width: 2,
          height: 28,
          marginLeft: 3,
          background: "var(--brand)",
          opacity: focus > 0.5 && (typing || caretOn(frame)) ? 1 : 0,
        }}
      />

      <div
        style={{
          marginLeft: "auto",
          padding: "12px 28px",
          borderRadius: 10,
          fontSize: 19,
          fontWeight: 600,
          color: "white",
          background: "var(--brand)",
          // A press that answers back, and lands on exactly 1 so no
          // frame outside the beat is left transformed.
          transform: `scale(${press(frame, RUN_CLICK).toFixed(4)})`,
        }}
      >
        Run
      </div>
    </div>
  );
}
