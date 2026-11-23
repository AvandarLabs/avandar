import css from "./Choice.module.css";
import type { ReactNode } from "react";

type Props = Readonly<{ action: ReactNode; note: string }>;

/** One way to resolve a changed theme file: its button and a line saying what it does. */
export function Choice({ action, note }: Props) {
  return (
    <li className={css.choice}>
      {action}
      <span className={css.choiceNote}>{note}</span>
    </li>
  );
}
