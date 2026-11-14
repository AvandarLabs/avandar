import { useLingui } from "@lingui/react/macro";
import { useId } from "react";
import { TokenRow } from "../TokenRow/TokenRow";
import {
  getEssentialRows,
  type TokenRow as TokenRowModel,
} from "../tokenRows/tokenRows";
import css from "./VideoThemeEditor.module.css";

/** The Essentials group: the few tokens that change a look the most. */
export function EssentialsGroup({
  rows,
}: Readonly<{ rows: readonly TokenRowModel[] }>) {
  const { t } = useLingui();
  const titleId = useId();
  return (
    <section className={css.essentials} aria-labelledby={titleId}>
      <h3 id={titleId} className={css.sectionTitle}>
        {t`Essentials`}
      </h3>
      {getEssentialRows(rows).map((row) => (
        <TokenRow key={row.path} row={row} />
      ))}
    </section>
  );
}
