import { useId, type ReactNode } from "react";
import { TokenRow } from "../../TokenRow/TokenRow";
import { TokenRows } from "../../TokenRows/TokenRows";
import { type TokenRow as TokenRowData } from "../../TokenRows/TokenRows.types";
import css from "./EssentialsGroup.module.css";

type Props = { rows: readonly TokenRowData[] };

/** The Essentials group: the few tokens that change a look the most. */
export function EssentialsGroup({ rows }: Readonly<Props>): ReactNode {
  const titleId = useId();
  return (
    <section className={css.essentialsGroup} aria-labelledby={titleId}>
      <h3 id={titleId} className={css.essentialsGroupTitle}>
        {"Look and feel"}
      </h3>
      {TokenRows.getEssentialRows(rows).map((row) => {
        return <TokenRow key={row.path} row={row} />;
      })}
    </section>
  );
}
