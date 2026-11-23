import { useLingui } from "@lingui/react/macro";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { DataCatalogMetadataChips } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogMetadataChips/DataCatalogMetadataChips";
import { formatCatalogListingDate } from "@/views/DataManagerApp/DataImportView/DataCatalogView/formatCatalogListingDate";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { ReactNode } from "react";

/** How many keywords show before "+{n} more" reveals the rest. */
const NUM_KEYWORDS_SHOWN = 8;

type Props = {
  listing: DataCatalogListing.T;
  /** Narrows the catalog to a topic the listing is filed under. */
  onSelectTopic: (domain: string) => void;
  /** Narrows the catalog to a keyword the listing carries. */
  onAddKeyword: (tag: string) => void;
};

/** The listing's coverage as a date range, or undefined when it has none. */
function _formatCoverage(
  listing: Readonly<DataCatalogListing.T>,
): string | undefined {
  const dates = [listing.coverageStartDate, listing.coverageEndDate]
    .filter((isoDate) => {
      return isoDate !== undefined;
    })
    .map((isoDate) => {
      return formatCatalogListingDate(new Date(isoDate));
    });
  return dates.length === 0 ? undefined : dates.join(" – ");
}

/**
 * The topics and keywords facts, each a run of chips that narrow the catalog
 * to the clicked value. A fact with no values is not rendered.
 */
function ChipFacts({
  topics,
  keywords,
  onSelectTopic,
  onAddKeyword,
}: {
  topics: readonly string[];
  keywords: readonly string[];
  onSelectTopic: (domain: string) => void;
  onAddKeyword: (tag: string) => void;
}): ReactNode {
  const { t } = useLingui();
  return (
    <>
      {topics.length > 0 ? (
        <AppViewRail.Fact label={t`Topics`}>
          <DataCatalogMetadataChips
            values={topics}
            getActionLabel={(topic) => {
              return t`Show datasets in ${topic}`;
            }}
            onSelect={onSelectTopic}
          />
        </AppViewRail.Fact>
      ) : null}
      {keywords.length > 0 ? (
        <AppViewRail.Fact label={t`Keywords`}>
          <DataCatalogMetadataChips
            values={keywords}
            numVisible={NUM_KEYWORDS_SHOWN}
            getActionLabel={(keyword) => {
              return t`Show datasets tagged ${keyword}`;
            }}
            onSelect={onAddKeyword}
          />
        </AppViewRail.Fact>
      ) : null}
    </>
  );
}

/**
 * The "About" group: what the dataset covers. Topics and keywords show as
 * chips that narrow the catalog to that value, then coverage, update
 * frequency, license, and notes. Not rendered when the listing has none.
 */
export function DataCatalogAboutGroup({
  listing,
  onSelectTopic,
  onAddKeyword,
}: Props): ReactNode {
  const { t } = useLingui();
  const topics = listing.domains ?? [];
  const keywords = listing.tags ?? [];
  const textFacts = [
    { label: t`Covers`, value: _formatCoverage(listing) },
    { label: t`Updates`, value: listing.updateFrequency },
    { label: t`License`, value: listing.license },
    { label: t`Notes`, value: listing.notes },
  ].filter((fact) => {
    return Boolean(fact.value);
  });
  if (topics.length === 0 && keywords.length === 0 && textFacts.length === 0) {
    return null;
  }

  return (
    <AppViewRail.Group title={t`About`}>
      <ChipFacts
        topics={topics}
        keywords={keywords}
        onSelectTopic={onSelectTopic}
        onAddKeyword={onAddKeyword}
      />
      {textFacts.map((fact) => {
        return (
          <AppViewRail.Fact key={fact.label} label={fact.label}>
            {fact.value}
          </AppViewRail.Fact>
        );
      })}
    </AppViewRail.Group>
  );
}
