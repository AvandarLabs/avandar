import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { uuid } from "$/lib/uuid";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnTypeVerifications } from "@/lib/openData/ColumnTypeVerifications";
import { readRememberedCompleteSample } from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import { requestOpenDataParquetCopy } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";
import { Logger } from "@/utils/Logger";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/utils/notifications/notify";
import { resolveOpenDataDatasetColumnInputs } from "@/views/DataManagerApp/DataImportView/DataCatalogView/buildOpenDataDatasetColumnInputs";
import { getCompanionsToRecommend } from "@/views/DataManagerApp/DataImportView/DataCatalogView/getCompanionsToRecommend/getCompanionsToRecommend";
import { notifyDatasetAdded } from "@/views/DataManagerApp/DataImportView/DataCatalogView/notifyDatasetAdded/notifyDatasetAdded";
import { readCatalogColumnsForAdding } from "@/views/DataManagerApp/DataImportView/DataCatalogView/readCatalogColumnsForAdding/readCatalogColumnsForAdding";
import { requestParquetCopyForAdding } from "@/views/DataManagerApp/DataImportView/DataCatalogView/requestParquetCopyForAdding/requestParquetCopyForAdding";
import { CATALOG_LISTING_COMPANIONS_QUERY_KEY } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingCompanions/useCatalogListingCompanions";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Adds catalog listings to the current workspace. */
type CatalogListingAdder = {
  /** The listings being added right now, from reading columns to saving. */
  addingListingIds: ReadonlySet<DataCatalogListing.Id>;
  /**
   * The listing whose add is waiting for its column types to be verified
   * before it saves.
   */
  waitingToAddListingId: DataCatalogListing.Id | undefined;
  /**
   * Adds a listing the user picked, then says so, offering to add the
   * listings recommended with it that the workspace does not have yet.
   * Resolves with the new dataset, or undefined when it was not added.
   */
  addListing: (listing: DataCatalogListing.T) => Promise<Dataset.T | undefined>;
  /** Adds a listing recommended with another, and says so. */
  addCompanion: (companion: DataCatalogListing.ResolvedCompanion) => void;
};

/**
 * The catalog's single-listing add flow: read the listing's columns,
 * verifying their types first when they are due, save the dataset, and
 * start its Parquet copy so the first build is under way before the dataset
 * is first opened. A listing picked in the catalog and a listing recommended
 * with it are added the same way.
 */
export function useAddCatalogListing(): CatalogListingAdder {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [addingListingIds, setAddingListingIds] = useState<
    ReadonlySet<DataCatalogListing.Id>
  >(new Set());
  const [waitingToAddListingId, setWaitingToAddListingId] = useState<
    DataCatalogListing.Id | undefined
  >();
  const [, , insertMutation] = DatasetClient.useInsertOpenDataDataset({
    queriesToInvalidate: [
      DatasetClient.QueryKeys.getAll(),
      CATALOG_LISTING_COMPANIONS_QUERY_KEY,
    ],
  });

  async function _readColumnsForAdding(
    listing: DataCatalogListing.T,
  ): Promise<readonly DataCatalogRelationColumn.T[] | undefined> {
    setWaitingToAddListingId(listing.id);
    try {
      return await readCatalogColumnsForAdding({
        listing,
        coordinator: ColumnTypeVerifications,
        readColumns: (catalogListingId) => {
          return DataCatalogRelationColumnClient.getAll(
            where("catalog_listing_id", "eq", catalogListingId),
          );
        },
      });
    } catch (error) {
      Logger.warn("Could not verify a catalog listing's columns to add it", {
        catalogListingId: listing.id,
        error,
      });
      notifyError({
        title: t`Cannot add dataset yet`,
        message: t`We couldn't check this dataset's columns. Try adding it again.`,
      });
      return undefined;
    } finally {
      setWaitingToAddListingId(undefined);
    }
  }

  // Starts the listing's Parquet copy as it is added, so the first build is
  // under way before the dataset is first opened. A complete sample the
  // preview already read becomes the copy, rather than reading the source
  // again.
  async function _requestParquetCopy(
    listing: DataCatalogListing.T,
  ): Promise<void> {
    try {
      const copyStatus = await requestParquetCopyForAdding({
        listing,
        requestCopy: requestOpenDataParquetCopy,
        readCompleteSample: readRememberedCompleteSample,
      });
      if (copyStatus === "preparing") {
        notifySuccess({
          title: t`Preparing your data`,
          message: t`"${listing.displayName}" is being prepared. Large datasets can take a few minutes to open the first time.`,
        });
      } else if (copyStatus === "failed") {
        notifyWarning({
          title: t`Data not ready`,
          message: t`We couldn't prepare the data for "${listing.displayName}", so it may not open.`,
        });
      }
    } catch (error) {
      Logger.warn("Could not request a catalog listing's Parquet copy", {
        catalogListingId: listing.id,
        error,
      });
    }
  }

  // Saves the dataset and starts its copy. A failed save has already been
  // reported by the mutation, so it resolves with undefined.
  async function _insertDataset(
    listing: DataCatalogListing.T,
  ): Promise<Dataset.T | undefined> {
    const columns = await _readColumnsForAdding(listing);
    if (columns === undefined) {
      return undefined;
    }
    const columnInputs = resolveOpenDataDatasetColumnInputs({
      catalogColumns: [...columns],
      metadata: listing.metadata,
    });
    if (!columnInputs) {
      notifyError({
        title: t`Cannot add dataset`,
        message: t`This catalog listing has no column metadata. It cannot be imported yet.`,
      });
      return undefined;
    }
    const insertedDataset = insertMutation.mutateAsync({
      catalogListingId: listing.id,
      columns: columnInputs,
      datasetDescription: listing.description ?? "",
      datasetId: uuid(),
      datasetName: listing.displayName,
      workspaceId: workspace.id,
    });
    void _requestParquetCopy(listing);
    return await insertedDataset.catch(() => {
      return undefined;
    });
  }

  async function _insertTracked(
    listing: DataCatalogListing.T,
  ): Promise<Dataset.T | undefined> {
    setAddingListingIds((ids) => {
      return new Set(ids).add(listing.id);
    });
    try {
      return await _insertDataset(listing);
    } finally {
      setAddingListingIds((ids) => {
        const remainingIds = new Set(ids);
        remainingIds.delete(listing.id);
        return remainingIds;
      });
    }
  }

  // The companions to offer once `catalogListingId` is added. A failure to
  // read them costs only the offer, so it reads as none.
  async function _readCompanionsToRecommend(
    catalogListingId: DataCatalogListing.Id,
  ): Promise<DataCatalogListing.ResolvedCompanion[]> {
    try {
      return getCompanionsToRecommend(
        await DataCatalogListingClient.getCompanions({
          catalogListingId,
          workspaceId: workspace.id,
        }),
      );
    } catch (error) {
      Logger.warn("Could not read a catalog listing's companions", {
        catalogListingId,
        error,
      });
      return [];
    }
  }

  async function addCompanion(
    companion: DataCatalogListing.ResolvedCompanion,
  ): Promise<void> {
    const { displayName } = companion;
    const listing = await DataCatalogListingClient.getById({
      id: companion.catalogListingId,
    }).catch((error: unknown) => {
      Logger.warn("Could not read a recommended catalog listing", {
        catalogListingId: companion.catalogListingId,
        error,
      });
      return undefined;
    });
    if (listing === undefined) {
      notifyError({
        title: t`Cannot add dataset`,
        message: t`We couldn't find "${displayName}" in the catalog. Try adding it again.`,
      });
      return;
    }
    const dataset = await _insertTracked(listing);
    if (dataset !== undefined) {
      notifyDatasetAdded({
        title: t`Dataset added`,
        message: t`"${dataset.name}" is now in your workspace.`,
        recommendation: undefined,
      });
    }
  }

  async function _addCompanionsInTurn(
    companions: readonly DataCatalogListing.ResolvedCompanion[],
  ): Promise<void> {
    for (const companion of companions) {
      await addCompanion(companion);
    }
  }

  async function addListing(
    listing: DataCatalogListing.T,
  ): Promise<Dataset.T | undefined> {
    const dataset = await _insertTracked(listing);
    if (dataset === undefined) {
      return undefined;
    }
    const companions = await _readCompanionsToRecommend(listing.id);
    const companionNames = companions
      .map((companion) => {
        return companion.displayName;
      })
      .join(", ");
    notifyDatasetAdded({
      title: t`Dataset added`,
      message: t`"${dataset.name}" is now in your workspace.`,
      recommendation:
        companions.length === 0
          ? undefined
          : {
              message: t`Recommended with it: ${companionNames}`,
              action: t`Add them too`,
              onAddAll: () => {
                void _addCompanionsInTurn(companions);
              },
            },
    });
    return dataset;
  }

  return {
    addingListingIds,
    waitingToAddListingId,
    addListing,
    addCompanion: (companion) => {
      void addCompanion(companion);
    },
  };
}
