import { Tabs } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useState } from "react";
import { DataCatalogSearchField } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogSearchField/DataCatalogSearchField";
import { DataCatalogView } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogView";
import { ConnectorsAdvisory } from "@/views/DataManagerApp/DataImportView/DataImportTabs/ConnectorsAdvisory/ConnectorsAdvisory";
import css from "@/views/DataManagerApp/DataImportView/DataImportTabs/DataImportTabs.module.css";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import { PostgresConnectorImportView } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/PostgresConnectorImportView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The import flows, in the order their tabs appear. */
export type DataImportTabId =
  | "upload-view"
  | "connectors-view"
  | "open-data-catalog";

type Props = {
  isAddAllowed: boolean;

  /**
   * When set, the import sub-views skip their default post-save navigation
   * and call this callback with the newly saved dataset instead.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;

  /**
   * Fires when the user switches flows. The open data catalog fills the
   * height it is given, so a host uses this to give it a definite height
   * while that tab is showing.
   */
  onTabChange?: (tabId: DataImportTabId) => void;
};

/**
 * The three import flows (manual upload, connectors, open data catalog)
 * wrapped in tabs. Shared between the standalone DataImportView page and
 * the Data Explorer's "Open" drawer.
 *
 * The tabs fill their host's height when the host has one to give, so a
 * panel that wants the full height, like the open data catalog, can take it.
 */
export function DataImportTabs({
  isAddAllowed,
  onSaveSuccess,
  onTabChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [activeTabId, setActiveTabId] =
    useState<DataImportTabId>("upload-view");
  const [search, setSearch] = useState("");
  const [isCatalogEmpty, setIsCatalogEmpty] = useState(false);
  const catalogSearch =
    activeTabId === "open-data-catalog" && !isCatalogEmpty ? (
      <DataCatalogSearchField
        className={css.dataImportTabsSearch}
        value={search}
        onChange={setSearch}
      />
    ) : undefined;

  return (
    <Tabs
      value={activeTabId}
      tabIds={["upload-view", "connectors-view", "open-data-catalog"] as const}
      classNames={{
        root: css.dataImportTabs,
        list: css.dataImportTabsList,
        panel: css.dataImportTabsPanel,
      }}
      onTabChange={(tabId) => {
        setActiveTabId(tabId);
        onTabChange?.(tabId);
      }}
      listRightSection={catalogSearch}
      renderTabHeader={{
        "upload-view": t`Upload`,
        "connectors-view": t`Connectors`,
        "open-data-catalog": t`Open data`,
      }}
      renderTabPanel={{
        "upload-view": () => {
          return <ManualUploadView onSaveSuccess={onSaveSuccess} />;
        },
        "connectors-view": () => {
          return (
            <Stack gap="xl">
              <GoogleSheetsImportView onSaveSuccess={onSaveSuccess} />
              <PostgresConnectorImportView onSaveSuccess={onSaveSuccess} />
              <ConnectorsAdvisory />
            </Stack>
          );
        },
        "open-data-catalog": () => {
          return (
            <DataCatalogView
              isAddAllowed={isAddAllowed}
              onSaveSuccess={onSaveSuccess}
              search={search}
              onSearchChange={setSearch}
              onCatalogEmptyChange={setIsCatalogEmpty}
            />
          );
        },
      }}
    />
  );
}
