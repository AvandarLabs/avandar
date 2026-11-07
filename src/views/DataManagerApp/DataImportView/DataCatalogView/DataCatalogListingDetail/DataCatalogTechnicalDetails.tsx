import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Collapse, Stack, Text } from "@mantine/core";
import { useDisclosure, useId } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail.module.css";
import { formatCatalogListingDate } from "@/views/DataManagerApp/DataImportView/DataCatalogView/formatCatalogListingDate";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Json } from "$/types/database.types";
import type { ReactNode } from "react";

type Props = {
  listing: DataCatalogListing.T;
};

type TechnicalFact = {
  label: string;
  value: string;
};

/**
 * The disclosure's contents: the technical facts, then the source record as
 * formatted JSON. Either is left out when it has nothing to show.
 */
function TechnicalDetailsBody({
  facts,
  sourceRecord,
}: {
  facts: readonly TechnicalFact[];
  sourceRecord: Json | undefined;
}): ReactNode {
  const sourceRecordLabelId = useId();
  return (
    <Stack gap="sm">
      {facts.length > 0 ? (
        <AppViewRail.Group>
          {facts.map((fact) => {
            return (
              <AppViewRail.Fact key={fact.label} label={fact.label}>
                {fact.value}
              </AppViewRail.Fact>
            );
          })}
        </AppViewRail.Group>
      ) : null}
      {sourceRecord === undefined ? null : (
        <figure
          aria-labelledby={sourceRecordLabelId}
          className={css.dataCatalogListingDetailSourceRecord}
        >
          <Text
            component="figcaption"
            id={sourceRecordLabelId}
            className={css.dataCatalogListingDetailSourceRecordLabel}
          >
            <Trans>Source record</Trans>
          </Text>
          <Text
            component="pre"
            size="xs"
            className={css.dataCatalogListingDetailRawMetadata}
          >
            {JSON.stringify(sourceRecord, undefined, 2)}
          </Text>
        </figure>
      )}
    </Stack>
  );
}

/** The disclosure's button, its chevron turning as it opens. */
function TechnicalDetailsToggle({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <Button
      variant="subtle"
      color="neutral"
      size="compact-xs"
      rightSection={
        <IconChevronDown
          size={14}
          aria-hidden
          className={
            isOpen
              ? css.dataCatalogListingDetailChevronOpen
              : css.dataCatalogListingDetailChevronClosed
          }
        />
      }
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <Trans>Technical details</Trans>
    </Button>
  );
}

/**
 * How the catalog got the listing, behind a disclosure that starts closed:
 * the pipeline that indexed it, its last run, when it was last indexed, and
 * the source record it was built from (its raw metadata when it has none).
 * Reference material only an expert reads. Not rendered when the listing
 * has none of it.
 */
export function DataCatalogTechnicalDetails({ listing }: Props): ReactNode {
  const { t } = useLingui();
  const [isOpen, disclosure] = useDisclosure(false);
  const sourceRecord = listing.sourceMetadata ?? listing.metadata;
  const lastIndexedDate = listing.dateOfLastSync;
  const facts = [
    { label: t`Indexed by`, value: listing.pipelineName },
    { label: t`Last run`, value: listing.pipelineRunId },
    {
      label: t`Last indexed`,
      value: lastIndexedDate
        ? formatCatalogListingDate(new Date(lastIndexedDate))
        : undefined,
    },
  ].filter((fact): fact is TechnicalFact => {
    return Boolean(fact.value);
  });
  if (facts.length === 0 && sourceRecord === undefined) {
    return null;
  }

  return (
    <Stack gap="xs" align="flex-start">
      <TechnicalDetailsToggle isOpen={isOpen} onToggle={disclosure.toggle} />
      <Collapse expanded={isOpen} w="100%">
        <TechnicalDetailsBody facts={facts} sourceRecord={sourceRecord} />
      </Collapse>
    </Stack>
  );
}
