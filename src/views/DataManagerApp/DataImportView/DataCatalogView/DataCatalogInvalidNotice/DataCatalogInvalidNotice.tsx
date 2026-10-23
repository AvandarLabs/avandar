import { Callout } from "@avandar/ui";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { MessageDescriptor } from "@lingui/core";
import type { ReactNode } from "react";

/** What each reason means to someone who only wanted the data. */
const REASON_MESSAGES: Record<
  DataCatalogListing.InvalidDatasetReason,
  MessageDescriptor
> = {
  empty_dataset: msg`The source file is empty.`,
  dataset_not_found: msg`The source no longer has this dataset.`,
  authorization_required: msg`The source requires a login to download this dataset.`,
  unsupported_format: msg`The source file isn't in a format Avandar can read as a table.`,
  external_host: msg`The file is hosted on a different site from the one that lists it, so Avandar doesn't download it.`,
  unparseable_dataset: msg`The file was downloaded, but Avandar couldn't read it as a table.`,
  unreachable_dataset: msg`The site that hosts the file didn't respond. This may be temporary.`,
};

type Props = {
  /** The catalog the listing came from, such as Humanitarian Data Exchange. */
  serviceName: string;
  /** Why the dataset cannot be loaded. */
  reason: DataCatalogListing.InvalidDatasetReason;
};

/**
 * Says that a catalog listing's dataset cannot be loaded, and why. The
 * listing stays in the catalog, since its source still indexes it: only its
 * data is out of reach.
 */
export function DataCatalogInvalidNotice({
  serviceName,
  reason,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  return (
    <Callout.Error
      title={t`This dataset is indexed in ${serviceName}, but it can't be loaded.`}
      titleSize="sm"
      message={i18n._(REASON_MESSAGES[reason])}
      messageSize="sm"
    />
  );
}
