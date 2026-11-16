import { clsx } from "clsx";
import css from "./parts.module.css";
import type { CSSProperties } from "react";

type Props = {
  title: string;
  /** Frame-driven style, for example the result of `enter()`. */
  style?: CSSProperties;
  className?: string;
};

/** An abstract card: a title and two placeholder text bars. */
export function DemoCard({ title, style, className }: Props) {
  return (
    <div className={clsx(css.card, className)} style={style}>
      <span className={css.cardTitle}>{title}</span>
      <span className={css.cardBar} />
      <span className={css.cardBarShort} />
    </div>
  );
}
