import { Trans, useLingui } from "@lingui/react/macro";
import {
  CloseButton,
  Radio,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { BetaBadge } from "@/components/badges/BetaBadge/BetaBadge";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { DataCatalogCheckboxFacet } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogCheckboxFacet";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail.module.css";
import { DataCatalogKeywordFacet } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogKeywordFacet";
import { DataCatalogOrganization2Facet } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogOrganization2Facet";
import type {
  CatalogFacets,
  CatalogListingFilters,
  CatalogUpdatedWithin,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { ReactNode } from "react";

type Props = {
  search: string;
  onSearchChange: (search: string) => void;
  filters: Readonly<CatalogListingFilters>;
  facets: Readonly<CatalogFacets>;
  onFiltersChange: (filters: CatalogListingFilters) => void;
};

/**
 * Everything that narrows the catalog, in the order a user reaches for it:
 * search first, then who published the data and what it is about, its
 * format, and how fresh it is. Every option carries the number of results it
 * would leave, so a user can see a dead end before walking into it.
 */
export function DataCatalogFilterRail({
  search,
  onSearchChange,
  filters,
  facets,
  onFiltersChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const updatedWithinLabels: Record<CatalogUpdatedWithin, string> = {
    any: t`Any time`,
    pastMonth: t`Past month`,
    pastYear: t`Past year`,
    overAYear: t`Over a year ago`,
  };

  return (
    <div className={css.dataCatalogFilterRail}>
      <Stack gap="lg" className={css.dataCatalogFilterRailBody}>
        <TextInput
          aria-label={t`Search open data`}
          placeholder={t`Search datasets`}
          leftSection={<IconSearch size={16} stroke={1.6} aria-hidden />}
          rightSection={
            search ? (
              <CloseButton
                size="sm"
                aria-label={t`Clear search`}
                onClick={() => {
                  onSearchChange("");
                }}
              />
            ) : null
          }
          value={search}
          onChange={(event) => {
            onSearchChange(event.currentTarget.value);
          }}
        />

        <DataCatalogCheckboxFacet
          label={t`Publisher`}
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

        <DataCatalogCheckboxFacet
          label={t`Topic`}
          options={facets.domains}
          chosenValues={filters.domains}
          onChange={(domains) => {
            onFiltersChange({ ...filters, domains });
          }}
        />

        <DataCatalogKeywordFacet
          chosenKeywords={filters.tags}
          onChange={(tags) => {
            onFiltersChange({ ...filters, tags });
          }}
        />

        <DataCatalogCheckboxFacet
          label={t`Format`}
          options={facets.formats}
          chosenValues={filters.formats}
          onChange={(formats) => {
            onFiltersChange({ ...filters, formats });
          }}
        />

        <Radio.Group
          label={t`Last updated`}
          value={filters.updatedWithin}
          onChange={(value) => {
            onFiltersChange({
              ...filters,
              updatedWithin: value as CatalogUpdatedWithin,
            });
          }}
          classNames={{ label: css.dataCatalogFilterRailFacetLabel }}
        >
          <Stack gap={6}>
            {(Object.keys(updatedWithinLabels) as CatalogUpdatedWithin[]).map(
              (updatedWithin) => {
                return (
                  <Radio
                    key={updatedWithin}
                    value={updatedWithin}
                    size="xs"
                    classNames={{
                      body: css.dataCatalogFilterRailOptionBody,
                      labelWrapper: css.dataCatalogFilterRailOptionLabelWrapper,
                    }}
                    label={
                      <span className={css.dataCatalogFilterRailOption}>
                        <span className={css.dataCatalogFilterRailOptionName}>
                          {updatedWithinLabels[updatedWithin]}
                        </span>
                        <span className={css.dataCatalogFilterRailOptionCount}>
                          {facets.updatedWithin[updatedWithin]}
                        </span>
                      </span>
                    }
                  />
                );
              },
            )}
          </Stack>
        </Radio.Group>

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
