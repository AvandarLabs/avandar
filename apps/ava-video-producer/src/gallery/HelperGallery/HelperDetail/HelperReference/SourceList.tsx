import css from "../HelperDetail.module.css";
import { SourceLink } from "./SourceLink";
import type { HelperEntry } from "../../helperCatalog.types";
import type { ReactNode } from "react";

type Props = {
  helper: HelperEntry;
};

/**
 * Links to the helper's primary source and then each related source, in
 * catalog order.
 */
export function SourceList({ helper }: Props): ReactNode {
  return (
    <ul className={css.links}>
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
