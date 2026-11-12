import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Flex } from "@mantine/core";
import { Outlet, useMatchRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "@/views/DataManagerApp/DataManagerApp.module.css";
import { DataManagerToolbarActions } from "@/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions";
import { DatasetNavbar } from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar";
import { NewDataDictionaryModal } from "@/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal";
import { useListPaneToggle } from "@/views/DataManagerApp/useListPaneToggle/useListPaneToggle";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The workspace's datasets and dictionaries that the list shows. */
function useDataManagerLists(): {
  datasets: Dataset.T[];
  dictionaries: DataDictionary.T[];
  isLoading: boolean;
} {
  const workspace = useCurrentWorkspace();
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [dictionaries, isLoadingDictionaries] = DataDictionaryClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  return {
    datasets: datasets ?? [],
    dictionaries: dictionaries ?? [],
    isLoading: isLoadingDatasets || isLoadingDictionaries,
  };
}

/**
 * Data Sources: the list of datasets and dictionaries beside whichever one
 * is open.
 *
 * On a phone the two do not fit side by side, so only one shows at a time.
 * The list shows on the app's home while there are datasets to pick from;
 * any page under it, such as a dataset or the import flow, takes the whole
 * width instead. A task view, such as learning a dictionary, hides the list
 * until Show list brings it back.
 */
export function DataManagerApp(): JSX.Element {
  const lists = useDataManagerLists();
  const [isNewDictionaryOpen, setIsNewDictionaryOpen] = useState(false);
  const { t } = useLingui();
  const matchRoute = useMatchRoute();
  const listPane = useListPaneToggle();
  const isOnHome = Boolean(matchRoute({ to: "/$workspaceSlug/data-manager" }));
  const hasListItems = lists.datasets.length + lists.dictionaries.length > 0;
  const phonePane =
    isOnHome && (lists.isLoading || hasListItems) ? "list" : "detail";

  return (
    <AppSlate
      title={t`Data Sources`}
      toolbarButtonSection={
        <DataManagerToolbarActions
          onNewDictionary={() => {
            setIsNewDictionaryOpen(true);
          }}
          listToggle={
            listPane.isToggleOffered
              ? {
                  isListShown: listPane.isListShown,
                  onToggle: listPane.onToggleList,
                }
              : undefined
          }
        />
      }
    >
      {
        // The routed view owns its own scrolling so its header band can stay
        // put while the content moves under it. Wrapping the outlet in a
        // scroll container here would scroll the band away with it.
      }
      <Flex
        align="stretch"
        h="100%"
        mih={0}
        className={css.dataManagerApp}
        data-phone-pane={phonePane}
      >
        {listPane.isListShown ? (
          <DatasetNavbar
            className={css.dataManagerAppList}
            isLoading={lists.isLoading}
            datasets={lists.datasets}
            dictionaries={lists.dictionaries}
          />
        ) : null}
        <Flex
          direction="column"
          flex={1}
          miw={0}
          mih={0}
          className={css.dataManagerAppDetail}
        >
          <Outlet />
        </Flex>
      </Flex>
      <NewDataDictionaryModal
        opened={isNewDictionaryOpen}
        onClose={() => {
          setIsNewDictionaryOpen(false);
        }}
      />
    </AppSlate>
  );
}
