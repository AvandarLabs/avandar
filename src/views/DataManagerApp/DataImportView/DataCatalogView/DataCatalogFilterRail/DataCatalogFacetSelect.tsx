import { useLingui } from "@lingui/react/macro";
import { Combobox, MultiSelect, Pill } from "@mantine/core";
import { useMemo, useState } from "react";
import { DataCatalogFacetOption } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFacetOption";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import { FACET_DROPDOWN_PROPS } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/facetDropdownProps";
import { filterAndRankByTokenSearch } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/tokenSearch/tokenSearch";
import type { CatalogFacetOption } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ComboboxItem, ComboboxParsedItem } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  /** The facet's visible name, which also labels its combobox. */
  label: string;

  /** What the combobox reads while nothing is chosen, such as "All topics". */
  placeholder: string;
  options: readonly CatalogFacetOption[];
  chosenValues: readonly string[];

  /**
   * What the closed field reads when this facet has nothing to offer, such
   * as "No topics".
   */
  emptyPlaceholder: string;

  /** True while a new search's counts are still being worked out. */
  isCountLoading: boolean;
  onChange: (chosenValues: string[]) => void;

  /**
   * Called with what the user types into the combobox, for a facet whose
   * options are searched outside it.
   */
  onSearchChange?: (search: string) => void;
};

/** Ranks the dropdown's options by how well they match what was typed. */
function _filterBySearch(input: {
  options: ComboboxParsedItem[];
  search: string;
}): ComboboxParsedItem[] {
  return filterAndRankByTokenSearch(input.options, input.search, (option) => {
    return "group" in option ? option.group : option.label;
  });
}

/**
 * One multi-choice facet as a searchable combobox. Typing narrows the
 * options by every fragment typed ("ty gov" finds "City government"), each
 * option shows how many results choosing it would leave, and each chosen
 * value sits in the field as a removable pill.
 */
export function DataCatalogFacetSelect({
  label,
  placeholder,
  options,
  chosenValues,
  emptyPlaceholder,
  isCountLoading,
  onChange,
  onSearchChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const [search, setSearch] = useState("");
  const countsByValue = useMemo(() => {
    return new Map(
      options.map((option) => {
        return [option.value, option.count];
      }),
    );
  }, [options]);
  const items = useMemo((): ComboboxItem[] => {
    // A chosen value the counts no longer offer still needs an item, or its
    // pill would render blank and could not be removed.
    const missingChosenValues = chosenValues.filter((value) => {
      return !countsByValue.has(value);
    });
    return [
      ...options.map((option) => {
        return option.value;
      }),
      ...missingChosenValues,
    ].map((value) => {
      return { value, label: value };
    });
  }, [options, chosenValues, countsByValue]);

  const isEmpty = options.length === 0 && chosenValues.length === 0;
  // A facet with nothing to offer stays on screen and says so. While counts
  // are still loading, the ordinary placeholder stays: "No topics" would
  // claim the search had none before the search had answered.
  const closedPlaceholder =
    isCountLoading || !isEmpty ? placeholder : emptyPlaceholder;

  return (
    <MultiSelect
      label={label}
      placeholder={chosenValues.length === 0 ? closedPlaceholder : undefined}
      data={items}
      value={[...chosenValues]}
      onChange={onChange}
      searchable
      searchValue={search}
      onSearchChange={(nextSearch) => {
        setSearch(nextSearch);
        onSearchChange?.(nextSearch);
      }}
      filter={_filterBySearch}
      nothingFoundMessage={t`No matches`}
      comboboxProps={FACET_DROPDOWN_PROPS}
      maxDropdownHeight={320}
      classNames={{ label: css.dataCatalogFilterRailFacetLabel }}
      // Once a value is chosen, the clear button takes the chevron's place.
      // This is drawn here rather than with `clearable`, which also pads the
      // pills for a chevron that is no longer there, and the narrow rail
      // cannot spare that room from every pill.
      rightSection={
        chosenValues.length > 0 ? (
          <Combobox.ClearButton
            // Hidden and untabbable by default, like the pills' buttons.
            aria-hidden={false}
            tabIndex={0}
            aria-label={t`Clear ${label}`}
            onClear={() => {
              onChange([]);
            }}
          />
        ) : undefined
      }
      rightSectionPointerEvents={chosenValues.length > 0 ? "all" : "none"}
      renderOption={({ option, checked }) => {
        return (
          <DataCatalogFacetOption
            label={option.label}
            count={countsByValue.get(option.value)}
            isCountLoading={isCountLoading}
            search={search}
            isChecked={checked === true}
          />
        );
      }}
      renderPill={({ option, value, onRemove, disabled }) => {
        const pillLabel = option?.label ?? String(value);
        return (
          <Pill
            radius="sm"
            withRemoveButton
            disabled={disabled}
            onRemove={onRemove}
            // Pill hides its remove button from assistive tech and the tab
            // order, leaning on Backspace inside the field. A filter with
            // many pills needs each one removable on its own.
            removeButtonProps={{
              "aria-label": t`Remove ${pillLabel}`,
              "aria-hidden": false,
              tabIndex: 0,
            }}
            className={css.dataCatalogFilterRailChip}
            title={pillLabel}
          >
            {/*
             * A name takes its own direction, so an English publisher in an
             * Arabic interface truncates at its end rather than its start.
             */}
            <span dir="auto" className={css.dataCatalogFilterRailChipLabel}>
              {pillLabel}
            </span>
          </Pill>
        );
      }}
    />
  );
}
