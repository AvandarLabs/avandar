import { notifications } from "@mantine/notifications";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { LocalDatasetQueryClient } from "@/clients/LocalDatasetQueryClient";
import { SpotlightLinks } from "@/config/SpotlightLinks";
import { AvaDexie } from "@/dexie/AvaDexie";
import { Logger } from "@/lib/Logger";

export function useSpotlightActions(
  workspaceSlug: string,
): Array<SpotlightActionData | SpotlightActionGroupData> {
  const router = useRouter();

  const navigationActions = useMemo(() => {
    const spotlightLinks = [
      SpotlightLinks.home,
      SpotlightLinks.profile(workspaceSlug),
      SpotlightLinks.dataManagerHome(workspaceSlug),
      SpotlightLinks.dataImport(workspaceSlug),
      SpotlightLinks.dataExplorer(workspaceSlug),
      SpotlightLinks.entityDesignerHome(workspaceSlug),
      SpotlightLinks.entityDesignerCreatorView(workspaceSlug),
    ];

    return spotlightLinks.map(
      ({
        link,
        spotlightDescription,
        icon,
      }): SpotlightActionData | SpotlightActionGroupData => {
        return {
          id: link.key,
          label: link.label,
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
              id: "delete-local-indexed-db",
              label: "Delete local data",
              description: "Delete all local Avandar data from the browser",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                await AvaDexie.deleteDatabase();
                notifications.show({
                  title: "Local data deleted",
                  message:
                    "All local Avandar data has been deleted. Please refresh the page.",
                  color: "green",
                });

                // delete the local OPFS database
                const root = await navigator.storage.getDirectory();
                await root.removeEntry("avandar.duckdb", {
                  recursive: false,
                });
              },
            },

            {
              id: "drop-duckdb-tables",
              label: "Drop DuckDB tables",
              description: "Drop all DuckDB tables",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                await LocalDatasetQueryClient.dropAllTables();
                notifications.show({
                  title: "DuckDB Datasets deleted",
                  message: "DuckDB Datasets deleted. Please refresh the page.",
                  color: "green",
                });
              },
            },

            {
              id: "list-duckdb-tables",
              label: "List DuckDB tables",
              description: "List all DuckDB tables",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                const tableNames =
                  await LocalDatasetQueryClient.getTableNames();
                Logger.log("Table names", tableNames.join("; "));
                notifications.show({
                  title: "Check the console",
                  message: "DuckDB tables have been printed to the console.",
                  color: "green",
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
    return [...navigationActions, ...devActions];
  }, [navigationActions, devActions]);
}
