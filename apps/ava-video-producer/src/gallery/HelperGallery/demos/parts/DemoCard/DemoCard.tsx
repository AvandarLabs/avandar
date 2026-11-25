import { clsx } from "clsx";
import css from "./DemoCard.module.css";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  title: string;
  /** Frame-driven style, for example the result of `enter()`. */
  style?: CSSProperties;
  className?: string;
};

/** An abstract card: a title and two placeholder text bars. */
export function DemoCard({
  title,
  style,
  className,
}: Readonly<Props>): ReactNode {
  return (
    <div className={clsx(css.demoCardCard, className)} style={style}>
      <span className={css.demoCardCardTitle}>{title}</span>
      <span className={css.demoCardCardBar} />
      <span className={css.demoCardCardBarShort} />
    </div>
  );
}
