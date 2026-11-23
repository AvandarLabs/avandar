import { SourceLink } from "../SourceLink";
import css from "./SourceList.module.css";
import type { HelperEntry } from "../../../helperCatalog.types";
import type { ReactNode } from "react";

type Props = {
  helper: HelperEntry;
};

/**
 * Links to the helper's primary source and then each related source, in
 * catalog order.
 */
export function SourceList({ helper }: Readonly<Props>): ReactNode {
  return (
    <ul className={css.sourceListLinks}>
      {[helper.source, ...helper.relatedSources].map((path) => {
        return (
          <li key={path}>
            <SourceLink path={path} />
          </li>
        );
      })}
    </ul>
  );
}
