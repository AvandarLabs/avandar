import { Tabs } from "@ui";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import { OpenDataCatalogView } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  isAddAllowed: boolean;

  /**
   * When set, the import sub-views skip their default post-save navigation
   * and call this callback with the newly saved dataset instead.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

/**
 * The three import flows (manual upload, connectors, open data catalog)
 * wrapped in tabs. Shared between the standalone DataImportView page and
 * the Data Explorer's "Open" drawer.
 */
export function DataImportTabs({
  isAddAllowed,
  onSaveSuccess,
}: Props): JSX.Element {
  return (
    <Tabs
      tabIds={["upload-view", "connectors-view", "open-data-catalog"] as const}
      renderTabHeader={{
        "upload-view": "Upload",
        "connectors-view": "Connectors",
        "open-data-catalog": "Open data",
      }}
      renderTabPanel={{
        "upload-view": () => {
          return <ManualUploadView py="md" onSaveSuccess={onSaveSuccess} />;
        },
        "connectors-view": () => {
          return (
            <GoogleSheetsImportView py="md" onSaveSuccess={onSaveSuccess} />
          );
        },
        "open-data-catalog": () => {
          return (
            <OpenDataCatalogView
              isAddAllowed={isAddAllowed}
              onSaveSuccess={onSaveSuccess}
              py="md"
            />
          );
        },
      }}
    />
  );
}
