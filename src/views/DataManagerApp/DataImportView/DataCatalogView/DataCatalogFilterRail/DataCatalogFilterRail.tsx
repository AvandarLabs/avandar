import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Switch, Text, UnstyledButton } from "@mantine/core";
import { BetaBadge } from "@/components/badges/BetaBadge/BetaBadge";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { DataCatalogFacetSelect } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFacetSelect";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import { DataCatalogOrganization2Facet } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogOrganization2Facet";
import { DataCatalogUpdatedWithinSelect } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogUpdatedWithinSelect";
import type {
  CatalogFacets,
  CatalogListingFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ReactNode } from "react";

type Props = {
  filters: Readonly<CatalogListingFilters>;
  facets: Readonly<CatalogFacets>;
  onFiltersChange: (filters: CatalogListingFilters) => void;
};

/**
 * The catalog's filters: who published the data and what it is about, its
 * format, and how fresh it is. Every option carries the number of results it
 * would leave, so a user can see a dead end before walking into it. Search
 * lives on the tab row, beside Open data.
 */
export function DataCatalogFilterRail({
  filters,
  facets,
  onFiltersChange,
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <div className={css.dataCatalogFilterRail}>
      <Stack gap="lg" className={css.dataCatalogFilterRailBody}>
        <DataCatalogFacetSelect
          label={t`Publisher`}
          placeholder={t`All publishers`}
          options={facets.sources}
          chosenValues={filters.sources}
          onChange={(sources) => {
            onFiltersChange({ ...filters, sources });
          }}
        />

        <DataCatalogOrganization2Facet
          isPublisherChosen={filters.sources.length > 0}
          labels={facets.organization2Labels}
          options={facets.organization2}
          chosenValues={filters.organization2Names}
          onChange={(organization2Names) => {
            onFiltersChange({ ...filters, organization2Names });
          }}
        />

        <DataCatalogFacetSelect
          label={t`Topic`}
          placeholder={t`All topics`}
          options={facets.domains}
          chosenValues={filters.domains}
          onChange={(domains) => {
            onFiltersChange({ ...filters, domains });
          }}
        />

        <DataCatalogFacetSelect
          label={t`Keywords`}
          placeholder={t`All keywords`}
          options={facets.tags}
          chosenValues={filters.tags}
          onChange={(tags) => {
            onFiltersChange({ ...filters, tags });
          }}
        />

        <DataCatalogFacetSelect
          label={t`Format`}
          placeholder={t`All formats`}
          options={facets.formats}
          chosenValues={filters.formats}
          onChange={(formats) => {
            onFiltersChange({ ...filters, formats });
          }}
        />

        <DataCatalogUpdatedWithinSelect
          value={filters.updatedWithin}
          counts={facets.updatedWithin}
          onChange={(updatedWithin) => {
            onFiltersChange({ ...filters, updatedWithin });
          }}
        />

        <Switch
          size="xs"
          checked={filters.isLoadableOnly}
          onChange={(event) => {
            onFiltersChange({
              ...filters,
              isLoadableOnly: event.currentTarget.checked,
            });
          }}
          label={t`Hide datasets that can't be loaded`}
          description={
            filters.isLoadableOnly && facets.numUnloadable > 0
              ? t`${facets.numUnloadable} hidden`
              : undefined
          }
        />
      </Stack>

      <Text size="xs" c="dimmed" className={css.dataCatalogFilterRailFoot}>
        <Trans>
          The catalog is in <BetaBadge size="xs" withTooltip={false} /> and
          grows from what people ask for. Missing a dataset?{" "}
          <UnstyledButton
            type="button"
            className={css.dataCatalogFilterRailRequestLink}
            onClick={() => {
              openFeaturebaseFeedbackWidget({
                boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
              });
            }}
          >
            Request one
          </UnstyledButton>
        </Trans>
      </Text>
    </div>
  );
}
