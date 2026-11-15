import { DEMO_THEME_STYLE } from "../demoTheme";
import css from "./HelperDemoFrame.module.css";
import type { ReactNode } from "react";

/** A named live value shown under a preview, for example `progress 0.42`. */
export type DemoReadout = { name: string; value: string };

type Props = {
  frame: number;
  frames: number;
  /** The call being previewed, shown as code. */
  label: string;
  readouts?: readonly DemoReadout[];
  children: ReactNode;
};

/**
 * The shared layout of every helper preview: the call being previewed, a
 * frame counter, a stage, and the live values the helper returns.
 */
export function HelperDemoFrame({
  frame,
  frames,
  label,
  readouts = [],
  children,
}: Props) {
  return (
    <div className={css.root} style={DEMO_THEME_STYLE}>
      <header className={css.header}>
        <code className={css.label}>{label}</code>
        <span className={css.counter}>
          frame {String(Math.floor(frame)).padStart(3, "0")} / {frames}
        </span>
      </header>
      <div className={css.stage}>{children}</div>
      <footer className={css.readouts}>
        {readouts.map((readout) => (
          <span key={readout.name} className={css.readout}>
            <span className={css.readoutName}>{readout.name}</span>
            <span className={css.readoutValue}>{readout.value}</span>
          </span>
        ))}
      </footer>
    </div>
  );
}
