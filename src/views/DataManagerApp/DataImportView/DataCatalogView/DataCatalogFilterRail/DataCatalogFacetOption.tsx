import { useLingui } from "@lingui/react/macro";
import { CheckIcon } from "@mantine/core";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import {
  findTokenSearchMatch,
  splitTextByMatchedRanges,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/tokenSearch/tokenSearch";
import type { ReactNode } from "react";

type Props = {
  label: string;

  /** How many datasets choosing this option would leave. */
  count: number | undefined;

  /** True while that number is being worked out again. */
  isCountLoading: boolean;

  /** What the user has typed, whose matched characters are highlighted. */
  search: string;

  /** Whether this option is already chosen, which draws its check mark. */
  isChecked: boolean;
};

/**
 * One option in a facet's dropdown: a check mark when it is chosen, its name
 * with the characters the typed search matched marked, and the number of
 * results it would leave on the far edge.
 */
export function DataCatalogFacetOption({
  label,
  count,
  isCountLoading,
  search,
  isChecked,
}: Props): ReactNode {
  const { t } = useLingui();
  const matchedRanges = findTokenSearchMatch(label, search)?.matchedRanges;

  return (
    <span className={css.dataCatalogFilterRailOption}>
      {/* The slot keeps its width when empty, so every name lines up. */}
      <span className={css.dataCatalogFilterRailOptionCheck}>
        {isChecked ? (
          <CheckIcon size={10} aria-hidden data-testid="facet-option-check" />
        ) : null}
      </span>
      {/* A name takes its own direction, so "(MTA)" stays whole in Arabic. */}
      <span dir="auto" className={css.dataCatalogFilterRailOptionName}>
        {splitTextByMatchedRanges(label, matchedRanges ?? []).map(
          (segment, index) => {
            return segment.isMatch ? (
              <mark
                // Segments never reorder, so their position is a stable key.
                key={index}
                className={css.dataCatalogFilterRailOptionMatch}
                data-testid="facet-search-match"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            );
          },
        )}
      </span>
      {isCountLoading ? (
        <span
          className={css.dataCatalogFilterRailCountLoading}
          data-testid="facet-option-count-loading"
          role="status"
          aria-label={t`Loading count`}
        />
      ) : count === undefined ? null : (
        <span className={css.dataCatalogFilterRailOptionCount}>{count}</span>
      )}
    </span>
  );
}
