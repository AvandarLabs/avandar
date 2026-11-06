import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, Flex } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import css from "@/views/DataManagerApp/DataManagerApp.module.css";
import { DatasetNavbar } from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar";

/**
 * Data Sources: the dataset list beside whichever dataset or task is open.
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
  const navigate = useNavigate();
  const { t } = useLingui();
  const matchRoute = useMatchRoute();
  const isOnHome = Boolean(matchRoute({ to: "/$workspaceSlug/data-manager" }));
  const phonePane =
    isOnHome && (isLoadingDatasets || (allDatasets ?? []).length > 0)
      ? "list"
      : "detail";

  return (
    <AppSlate
      title={t`Data Sources`}
      toolbarButtonSection={
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
          isLoading={isLoadingDatasets}
          datasets={allDatasets ?? []}
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
    </AppSlate>
  );
}
