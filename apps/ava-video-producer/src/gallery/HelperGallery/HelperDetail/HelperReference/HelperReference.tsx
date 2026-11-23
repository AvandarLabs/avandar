import { DefaultsList } from "./DefaultsList/DefaultsList";
import css from "./HelperReference.module.css";
import { SourceList } from "./SourceList/SourceList";
import { UsedByList } from "./UsedByList/UsedByList";
import type { HelperEntry } from "../../helperCatalog.types";
import type { ReactNode } from "react";

type Props = {
  helper: HelperEntry;
};

/** Exports, defaults, consumers and source of the selected helper. */
export function HelperReference({ helper }: Readonly<Props>): ReactNode {
  return (
    <aside className={css.helperReferenceReference}>
      <h3>Exports</h3>
      <ul className={css.helperReferenceExports}>
        {helper.exports.map((name) => {
          return (
            <li key={name}>
              <code>{name}</code>
            </li>
          );
        })}
      </ul>
      <h3>Defaults</h3>
      <DefaultsList helper={helper} />
      <h3>Used by</h3>
      <UsedByList helper={helper} />
      <h3>Source</h3>
      <SourceList helper={helper} />
    </aside>
  );
}
