import { DemoTheme } from "../DemoTheme";
import css from "./parts.module.css";
import type { ReactNode } from "react";
/** Bar heights of each window variant, as fractions of the body. */
const VARIANTS = [
  [0.45, 0.7, 0.55, 0.9, 0.65],
  [0.8, 0.5, 0.35, 0.6, 0.3],
  [0.3, 0.45, 0.6, 0.75, 0.95],
] as const;
/** Stable keys of the five bars every variant draws. */
const BAR_IDS = ["first", "second", "third", "fourth", "fifth"] as const;
/** The preview colour role each window variant's bars draw in. */
const VARIANT_COLORS = ["brand", "highlight", "success"] as const;
type Props = {
  /** Picks the body's bars and colour so neighbouring windows differ. */
  variant?: 0 | 1 | 2;
  label?: string;
};
/**
 * An abstract window: a titlebar and a small bar chart. Previews use it in
 * place of a screenshot, so window motion reads without product content.
 */
export function DemoWindow({ variant = 0, label }: Props): ReactNode {
  const colors = DemoTheme.useDemoColors();
  return (
    <div className={css.window}>
      <div className={css.titlebar}>
        <span className={css.titlebarDot} />
        <span className={css.titlebarDot} />
        <span className={css.titlebarDot} />
      </div>
      <div className={css.windowBody}>
        {label ? <span className={css.windowLabel}>{label}</span> : null}
        {BAR_IDS.map((id, index) => {
          return (
            <span
              key={id}
              className={css.windowBar}
              style={{
                height: `${VARIANTS[variant][index] * 70}%`,
                background: colors[VARIANT_COLORS[variant]],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
