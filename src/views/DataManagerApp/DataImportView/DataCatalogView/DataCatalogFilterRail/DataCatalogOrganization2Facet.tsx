import { useLingui } from "@lingui/react/macro";
import { DataCatalogFacetSelect } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFacetSelect";
import type { CatalogFacetOption } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ReactNode } from "react";

type Props = {
  /** Whether any publisher is chosen, which the second level lives inside. */
  isPublisherChosen: boolean;

  /** What the chosen publishers' drives call this level, most common first. */
  labels: readonly string[];
  options: readonly CatalogFacetOption[];
  chosenValues: readonly string[];

  /** True while the counts beside the options are being worked out again. */
  isCountLoading: boolean;
  onChange: (chosenValues: string[]) => void;
};

/**
 * The rail's second organization level, such as a city's agencies. It only
 * means something inside a chosen publisher, and its name comes from that
 * publisher's portal ("Agency", "Agency or Department"), so it is not
 * rendered until a publisher is chosen.
 */
export function DataCatalogOrganization2Facet({
  isPublisherChosen,
  labels,
  options,
  chosenValues,
  isCountLoading,
  onChange,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  if (!isPublisherChosen) {
    return null;
  }

  return (
    <DataCatalogFacetSelect
      label={
        labels.length > 0
          ? new Intl.ListFormat(i18n.locale, { type: "disjunction" }).format(
              labels,
            )
          : t`Organization`
      }
      placeholder={t`All organizations`}
      options={options}
      chosenValues={chosenValues}
      emptyPlaceholder={t`No organizations`}
      isCountLoading={isCountLoading}
      onChange={onChange}
    />
  );
}
