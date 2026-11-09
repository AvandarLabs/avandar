import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  /** Who publishes the listing, such as City of New York. */
  serviceName: string;
  /** The listing's page at its source, when it has one. */
  sourceUrl: string | undefined;
  /**
   * True when the source holds no rows for the dataset yet, which is why it
   * cannot be added, rather than its being a kind Avandar cannot read.
   */
  hasNoRows: boolean;
};

/**
 * Says that a catalog listing is a kind of dataset Avandar cannot add to a
 * workspace yet, such as a map or a PDF, and links to the original so it
 * is still reachable. The listing stays in the catalog so a search finds
 * it rather than silently leaving it out.
 *
 * A dataset whose publisher has not added any rows yet says that instead,
 * since it is a kind Avandar can add once it has data.
 */
export function DataCatalogUnsupportedNotice({
  serviceName,
  sourceUrl,
  hasNoRows,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Callout.Info
      title={
        hasNoRows
          ? t`This dataset has no data yet`
          : t`Avandar can't add this kind of dataset yet.`
      }
      titleSize="sm"
      message={
        hasNoRows
          ? t`The publisher has not added any rows to it. You can still open the original, where it is published.`
          : t`You can still open the original, where it is published.`
      }
      messageSize="sm"
    >
      {sourceUrl ? (
        <Anchor href={sourceUrl} target="_blank" rel="noreferrer" size="sm">
          <Trans>Open it on {serviceName}</Trans>
        </Anchor>
      ) : null}
    </Callout.Info>
  );
}
