import css from "./DefaultsList.module.css";
import type { HelperEntry } from "../../../helperCatalog.types";
import type { ReactNode } from "react";

type Props = { helper: HelperEntry };

/** The helper's named defaults, or a note that it has none. */
export function DefaultsList({ helper }: Readonly<Props>): ReactNode {
  if (!helper.defaults.length) {
    return (
      <p className={css.defaultsListMuted}>
        No defaults: the value is fixed or every argument is required.
      </p>
    );
  }
  return (
    <dl className={css.defaultsListDefaults}>
      {helper.defaults.map((item) => {
        return (
          <div key={item.name}>
            <dt>{item.name}</dt>
            <dd>
              <code>{item.value}</code>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
