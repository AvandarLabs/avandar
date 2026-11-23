import { Trans, useLingui } from "@lingui/react/macro";
import { Anchor, Badge, Button, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { match } from "ts-pattern";
import { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogRecommendedListings/DataCatalogRecommendedListings.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The listings recommended alongside the open one, in display order. */
  companions: readonly DataCatalogListing.ResolvedCompanion[];
  /** When false, adding is blocked (e.g. subscription limit). */
  isAddAllowed: boolean;
  /** The listings being added to the workspace right now. */
  addingListingIds: ReadonlySet<DataCatalogListing.Id>;
  /** Opens a companion in the catalog, as picking a search result does. */
  onSelectListing: (catalogListingId: DataCatalogListing.Id) => void;
  /** Adds a companion to the workspace. */
  onAddCompanion: (companion: DataCatalogListing.ResolvedCompanion) => void;
};

/** Why a companion is recommended, in the user's words. */
function CompanionReason({
  companion,
}: {
  companion: DataCatalogListing.ResolvedCompanion;
}): ReactNode {
  const { t } = useLingui();
  const reason = match(companion.kind)
    .with("lookup", () => {
      const columnList = DataCatalogListing.toCompanionCodeColumns(
        companion.joinOn,
      ).join(", ");
      return t`Names the codes in ${columnList}`;
    })
    .exhaustive();
  return (
    <Text size="xs" c="dimmed">
      {reason}
    </Text>
  );
}

/**
 * Whether a companion can be added, or the add button when it can. One in
 * the workspace already says so before anything else, since it needs no
 * action whatever else is true of it.
 */
function CompanionStatus({
  companion,
  isAddAllowed,
  isAdding,
  onAddCompanion,
}: {
  companion: DataCatalogListing.ResolvedCompanion;
  isAddAllowed: boolean;
  isAdding: boolean;
  onAddCompanion: (companion: DataCatalogListing.ResolvedCompanion) => void;
}): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  if (companion.isInWorkspace) {
    return (
      <Badge variant="light" color="neutral" size="sm">
        <Trans>In your workspace</Trans>
      </Badge>
    );
  }
  if (!companion.isWorkspaceLoadable) {
    return (
      <Text size="xs" c="dimmed">
        <Trans>Not supported yet</Trans>
      </Text>
    );
  }
  if (companion.isInvalid) {
    return (
      <Text size="xs" c="danger.8">
        <Trans>Can't be loaded</Trans>
      </Text>
    );
  }
  const { displayName } = companion;
  return (
    <Button
      variant="default"
      size="compact-xs"
      leftSection={<IconPlus size={12} aria-hidden />}
      loading={isAdding}
      disabled={!isAddAllowed || offline.isBlocked}
      aria-label={t`Add ${displayName} to workspace`}
      onClick={offline.guard(() => {
        onAddCompanion(companion);
      })}
    >
      <Trans>Add</Trans>
    </Button>
  );
}

/**
 * The listings usually added with the open one, such as the list that names
 * the country codes an indicator holds. Each row says why it is recommended
 * and whether the workspace has it, and offers to add it when it can be.
 * Nothing renders when no recommendation resolves to a listing.
 */
export function DataCatalogRecommendedListings({
  companions,
  isAddAllowed,
  addingListingIds,
  onSelectListing,
  onAddCompanion,
}: Props): ReactNode {
  const { t } = useLingui();
  if (companions.length === 0) {
    return null;
  }
  return (
    <AppViewSection
      title={<Trans>Recommended with this dataset</Trans>}
      meta={t`${companions.length}`}
    >
      <ul className={css.dataCatalogRecommendedListings}>
        {companions.map((companion) => {
          return (
            <li
              key={companion.catalogListingId}
              className={css.dataCatalogRecommendedListingsRow}
            >
              <div className={css.dataCatalogRecommendedListingsText}>
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  className={css.dataCatalogRecommendedListingsName}
                  onClick={() => {
                    onSelectListing(companion.catalogListingId);
                  }}
                >
                  {companion.displayName}
                </Anchor>
                <CompanionReason companion={companion} />
              </div>
              <CompanionStatus
                companion={companion}
                isAddAllowed={isAddAllowed}
                isAdding={addingListingIds.has(companion.catalogListingId)}
                onAddCompanion={onAddCompanion}
              />
            </li>
          );
        })}
      </ul>
    </AppViewSection>
  );
}
