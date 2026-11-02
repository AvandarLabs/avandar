import { clearOpfs } from "@avandar/browser-utils";
import { useLingui } from "@lingui/react/macro";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconDatabase, IconInfoCircle, IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { SpotlightLinks } from "@/config/SpotlightLinks";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { Logger } from "@/utils/Logger";
import { notifySuccess } from "@/utils/notifications/notify";

/** Returns workspace navigation, app information, and development commands. */
export function useSpotlightActions(
  workspaceSlug: string,
): Array<SpotlightActionData | SpotlightActionGroupData> {
  const router = useRouter();
  const { t } = useLingui();
  const appVersion = import.meta.env.VITE_APP_VERSION;

  const navigationActions = useMemo(() => {
    const spotlightLinks = [
      SpotlightLinks.home,
      SpotlightLinks.profile(workspaceSlug),
      SpotlightLinks.dataManagerHome(workspaceSlug),
      SpotlightLinks.dataImport(workspaceSlug),
      SpotlightLinks.dataExplorer(workspaceSlug),
      SpotlightLinks.ontologyDesignerHome(workspaceSlug),
      SpotlightLinks.ontologyDesignerCreatorView(workspaceSlug),
    ];

    return spotlightLinks.map(
      ({
        link,
        spotlightDescription,
        icon,
      }): SpotlightActionData | SpotlightActionGroupData => {
        return {
          id: link.key,
          label: link.label(),
          description: spotlightDescription,
          leftSection: icon,
          onClick: () => {
            router.navigate({ to: link.to, params: { workspaceSlug } });
          },
        };
      },
    );
  }, [router, workspaceSlug]);

  const devActions = useMemo(() => {
    if (import.meta.env.DEV) {
      return [
        {
          group: "Dev Actions",
          actions: [
            {
              id: "delete-local-data",
              label: "Delete local data",
              description:
                "Delete all local Avandar data from the browser (IndexedDB and DuckDB)",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                // delete indexed db
                await AvaDexie.deleteDatabase();

                // delete any local OPFS data
                await clearOpfs();
                notifySuccess({
                  title: "Local data deleted",
                  message:
                    "All local Avandar data has been deleted. Please refresh the page.",
                });
              },
            },

            {
              id: "list-duckdb-tables",
              label: "List DuckDB tables and views",
              description: "List all DuckDB tables",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                const relationNames = await DuckDbClient.getTableOrViewNames();
                Logger.log("Relation names", relationNames.join("; "));
                notifySuccess({
                  title: "Check the console",
                  message:
                    "DuckDB tables and views have been printed to the console.",
                });
              },
            },

            {
              id: "list-opfs-files",
              label: "List OPFS files",
              description: "List all OPFS files",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                const root = await navigator.storage.getDirectory();
                const fileNames: string[] = [];
                for await (const entry of root.values()) {
                  fileNames.push(entry.name);
                }
                Logger.log("OPFS files", fileNames.join("; "));
                notifySuccess({
                  title: "Check the console",
                  message: "DuckDB tables have been printed to the console.",
                });
              },
            },

            {
              id: "show-duckdb-schema",
              label: "Show DuckDB schemas",
              description: "Show the schema of the DuckDB database",
              leftSection: <IconDatabase size={24} stroke={1.5} />,
              onClick: async () => {
                const { DevDuckDbTableSchemaView } =
                  await import("@/components/spotlight-modals/DevDuckDbTableSchemaView/DevDuckDbTableSchemaView");
                modals.open({
                  title: "Dev: Show DuckDB schemas",
                  children: <DevDuckDbTableSchemaView />,
                  size: "80%",
                });
              },
            },
          ],
        },
      ];
    }
    return [];
  }, []);

  return useMemo(() => {
    return [
      ...navigationActions,
      {
        id: "show-current-version",
        label: t`Show current version`,
        description: t`Avandar ${appVersion}`,
        leftSection: <IconInfoCircle size={24} stroke={1.5} />,
        onClick: () => {
          notifications.show({
            id: "app-version",
            title: t`Current version`,
            message: t`Avandar ${appVersion}`,
            autoClose: false,
          });
        },
      },
      ...devActions,
    ];
  }, [navigationActions, devActions, t, appVersion]);
}
