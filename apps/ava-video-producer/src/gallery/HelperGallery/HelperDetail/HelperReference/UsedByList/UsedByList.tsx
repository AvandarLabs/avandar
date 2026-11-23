import { SourceLink } from "../SourceLink";
import css from "./UsedByList.module.css";
import type { HelperEntry } from "../../../helperCatalog.types";
import type { ReactNode } from "react";

type Props = { helper: HelperEntry };

/** Links to the files that import the helper, or a note that none do. */
export function UsedByList({ helper }: Readonly<Props>): ReactNode {
  if (!helper.usedBy.length) {
    return <p className={css.usedByListMuted}>No scene imports it yet.</p>;
  }
  return (
    <ul className={css.usedByListLinks}>
      {helper.usedBy.map((path) => {
        return (
          <li key={path}>
            <SourceLink path={path} />
          </li>
        );
      })}
    </ul>
  );
}
