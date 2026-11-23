import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { useState } from "react";
import { DataCatalogFacetOption } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFacetOption";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import { FACET_DROPDOWN_PROPS } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/facetDropdownProps";
import { filterAndRankByTokenSearch } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/tokenSearch/tokenSearch";
import type {
  CatalogFacets,
  CatalogUpdatedWithin,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ReactNode } from "react";

/** The windows in the order they are offered, widest first. */
const UPDATED_WITHIN_ORDER: readonly CatalogUpdatedWithin[] = [
  "any",
  "pastMonth",
  "pastYear",
  "overAYear",
];

type Props = {
  value: CatalogUpdatedWithin;
  counts: Readonly<CatalogFacets["updatedWithin"]>;

  /** True while the counts beside the windows are being worked out again. */
  isCountLoading: boolean;
  onChange: (updatedWithin: CatalogUpdatedWithin) => void;
};

/**
 * The rail's Last updated facet: a single choice of how fresh the data must
 * be, as a searchable combobox whose options carry the number of results
 * each would leave.
 */
export function DataCatalogUpdatedWithinSelect({
  value,
  counts,
  isCountLoading,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const [search, setSearch] = useState("");
  const labels: Record<CatalogUpdatedWithin, string> = {
    any: t`Any time`,
    pastMonth: t`Past month`,
    pastYear: t`Past year`,
    overAYear: t`Over a year ago`,
  };
  // The field shows the chosen option's name until the user types over it,
  // and that name is not a search.
  const typedSearch = search === labels[value] ? "" : search;

  return (
    <Select<CatalogUpdatedWithin>
      label={t`Last updated`}
      data={UPDATED_WITHIN_ORDER.map((updatedWithin) => {
        return { value: updatedWithin, label: labels[updatedWithin] };
      })}
      value={value}
      onChange={(updatedWithin) => {
        if (updatedWithin) {
          onChange(updatedWithin);
        }
      }}
      allowDeselect={false}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      filter={({ options }) => {
        return filterAndRankByTokenSearch(options, typedSearch, (option) => {
          return "group" in option ? option.group : option.label;
        });
      }}
      nothingFoundMessage={t`No matches`}
      comboboxProps={FACET_DROPDOWN_PROPS}
      classNames={{ label: css.dataCatalogFilterRailFacetLabel }}
      renderOption={({ option, checked }) => {
        return (
          <DataCatalogFacetOption
            label={option.label}
            count={counts[option.value]}
            isCountLoading={isCountLoading}
            search={typedSearch}
            isChecked={checked === true}
          />
        );
      }}
    />
  );
}
