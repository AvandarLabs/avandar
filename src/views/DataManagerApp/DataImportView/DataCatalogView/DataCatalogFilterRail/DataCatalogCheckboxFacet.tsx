import { Trans } from "@lingui/react/macro";
import { Button, Checkbox, Stack } from "@mantine/core";
import { useState } from "react";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import type { CatalogFacetOption } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ReactNode } from "react";

/** How many options a facet shows before it folds the rest away. */
const NUM_OPTIONS_SHOWN_FOLDED = 6;

type Props = {
  /** The facet's visible name, which also labels the checkbox group. */
  label: string;
  options: readonly CatalogFacetOption[];
  chosenValues: readonly string[];
  onChange: (chosenValues: string[]) => void;
};

/**
 * One multi-choice facet: a checkbox per value with the number of results
 * choosing it would show. A long facet folds after a handful of values,
 * keeping any chosen value visible so a user never loses track of what is
 * narrowing their results.
 */
export function DataCatalogCheckboxFacet({
  label,
  options,
  chosenValues,
  onChange,
}: Props): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false);
  if (options.length === 0) {
    return null;
  }
  const isFoldable = options.length > NUM_OPTIONS_SHOWN_FOLDED;
  const visibleOptions =
    isFoldable && !isExpanded
      ? options.filter((option, index) => {
          return (
            index < NUM_OPTIONS_SHOWN_FOLDED ||
            chosenValues.includes(option.value)
          );
        })
      : options;

  return (
    <Checkbox.Group
      label={label}
      value={[...chosenValues]}
      onChange={onChange}
      classNames={{ label: css.dataCatalogFilterRailFacetLabel }}
    >
      <Stack gap={6}>
        {visibleOptions.map((option) => {
          return (
            <Checkbox
              key={option.value}
              value={option.value}
              size="xs"
              classNames={{
                body: css.dataCatalogFilterRailOptionBody,
                labelWrapper: css.dataCatalogFilterRailOptionLabelWrapper,
              }}
              label={
                <span className={css.dataCatalogFilterRailOption}>
                  <span
                    className={css.dataCatalogFilterRailOptionName}
                    title={option.value}
                  >
                    {option.value}
                  </span>
                  <span className={css.dataCatalogFilterRailOptionCount}>
                    {option.count}
                  </span>
                </span>
              }
            />
          );
        })}
        {isFoldable ? (
          <Button
            variant="subtle"
            color="neutral"
            size="compact-xs"
            className={css.dataCatalogFilterRailFoldToggle}
            aria-expanded={isExpanded}
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <Trans>Show fewer</Trans>
            ) : (
              <Trans>Show all {options.length}</Trans>
            )}
          </Button>
        ) : null}
      </Stack>
    </Checkbox.Group>
  );
}
