import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, Flex, Group } from "@mantine/core";
import { IconBook, IconPlus } from "@tabler/icons-react";
import { Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "@/views/DataManagerApp/DataManagerApp.module.css";
import { DatasetNavbar } from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar";
import { NewDataDictionaryModal } from "@/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal";

/**
 * Data Sources: the list of datasets and dictionaries beside whichever one
 * is open.
 *
 * On a phone the two do not fit side by side, so only one shows at a time.
 * The list shows on the app's home while there are datasets to pick from;
 * any page under it, such as a dataset or the import flow, takes the whole
 * width instead.
 */
export function DataManagerApp(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [allDatasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [allDictionaries, isLoadingDictionaries] =
    DataDictionaryClient.useGetAll(where("workspace_id", "eq", workspace.id));
  const isLoading = isLoadingDatasets || isLoadingDictionaries;
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  const [isNewDictionaryOpen, setIsNewDictionaryOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLingui();
  const matchRoute = useMatchRoute();
  const isOnHome = Boolean(matchRoute({ to: "/$workspaceSlug/data-manager" }));
  const hasListItems =
    (allDatasets ?? []).length + (allDictionaries ?? []).length > 0;
  const phonePane = isOnHome && (isLoading || hasListItems) ? "list" : "detail";

  return (
    <AppSlate
      title={t`Data Sources`}
      toolbarButtonSection={
        <Group gap="xs" wrap="nowrap">
          {canEditDictionaries ? (
            <Button
              leftSection={<IconBook size={18} />}
              onClick={() => {
                setIsNewDictionaryOpen(true);
              }}
              size="compact-sm"
              variant="default"
            >
              {t`New dictionary`}
            </Button>
          ) : null}
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              navigate(AppLinks.dataImport(workspace.slug));
            }}
            size="compact-sm"
            variant="light"
          >
            {t`Add new dataset`}
          </Button>
        </Group>
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
        <DatasetNavbar
          className={css.dataManagerAppList}
          isLoading={isLoading}
          datasets={allDatasets ?? []}
          dictionaries={allDictionaries ?? []}
        />
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
