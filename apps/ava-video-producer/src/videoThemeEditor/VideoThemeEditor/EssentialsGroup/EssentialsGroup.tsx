import { useId, type ReactNode } from "react";
import { TokenRow } from "../../TokenRow/TokenRow";
import { getEssentialRows } from "../../tokenRows/tokenRows";
import { type TokenRow as TokenRowData } from "../../tokenRows/tokenRows.types";
import css from "./EssentialsGroup.module.css";
/** The Essentials group: the few tokens that change a look the most. */
export function EssentialsGroup({
  rows,
}: Readonly<{ rows: readonly TokenRowData[] }>): ReactNode {
  const titleId = useId();
  return (
    <section className={css.essentialsGroup} aria-labelledby={titleId}>
      <h3 id={titleId} className={css.essentialsGroupTitle}>
        {"Look and feel"}
      </h3>
      {getEssentialRows(rows).map((row) => {
        return <TokenRow key={row.path} row={row} />;
      })}
    </section>
  );
}
