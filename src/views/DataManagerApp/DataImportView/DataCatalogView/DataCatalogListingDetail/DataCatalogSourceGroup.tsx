import { useLingui } from "@lingui/react/macro";
import { Anchor, Stack } from "@mantine/core";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { getCatalogListingFormat } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { getSourceHost } from "@/views/DataManagerApp/DataImportView/DataCatalogView/getSourceHost/getSourceHost";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { ReactNode } from "react";

type Props = {
  listing: DataCatalogListing.T;
};

/** A link that leaves Avandar, opened in a new tab. */
function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): ReactNode {
  return (
    <Anchor href={href} size="xs" target="_blank" rel="noopener noreferrer">
      {children}
    </Anchor>
  );
}

/** The listing's canonical pages, one per line, each named by its host. */
function CanonicalLinks({ urls }: { urls: readonly string[] }): ReactNode {
  return (
    <Stack gap={2}>
      {urls.map((url) => {
        return (
          <ExternalLink key={url} href={url}>
            {getSourceHost(url)}
          </ExternalLink>
        );
      })}
    </Stack>
  );
}

/**
 * The "Source" group: where the dataset comes from. The service that serves
 * it, the original page named by its host, a download of the source file
 * named by its format, and any canonical pages, also named by host. Not
 * rendered when the listing has none of them.
 */
export function DataCatalogSourceGroup({ listing }: Props): ReactNode {
  const { t } = useLingui();
  const canonicalUrls = listing.canonicalUrls ?? [];
  if (
    !listing.externalServiceName &&
    !listing.sourceUrl &&
    !listing.sourceDownloadUrl &&
    canonicalUrls.length === 0
  ) {
    return null;
  }

  return (
    <AppViewRail.Group title={t`Source`}>
      {listing.externalServiceName ? (
        <AppViewRail.Fact label={t`Service`}>
          {listing.externalServiceName}
        </AppViewRail.Fact>
      ) : null}
      {listing.sourceUrl ? (
        <AppViewRail.Fact label={t`Original`}>
          <ExternalLink href={listing.sourceUrl}>
            {getSourceHost(listing.sourceUrl)}
          </ExternalLink>
        </AppViewRail.Fact>
      ) : null}
      {listing.sourceDownloadUrl ? (
        <AppViewRail.Fact label={t`Download`}>
          <ExternalLink href={listing.sourceDownloadUrl}>
            {getCatalogListingFormat(listing) ?? t`File`}
          </ExternalLink>
        </AppViewRail.Fact>
      ) : null}
      {canonicalUrls.length > 0 ? (
        <AppViewRail.Fact label={t`Canonical`}>
          <CanonicalLinks urls={canonicalUrls} />
        </AppViewRail.Fact>
      ) : null}
    </AppViewRail.Group>
  );
}
