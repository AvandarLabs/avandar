import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { SpotlightLinks } from "@/config/SpotlightLinks";
import { AvaDexie } from "@/dexie/AvaDexie";
import { Logger } from "@/lib/Logger";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { clearOPFS } from "@/lib/utils/browser/clearOPFS";

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
              id: "delete-local-data",
              label: "Delete local data",
              description:
                "Delete all local Avandar data from the browser (IndexedDB and DuckDB)",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                // delete indexed db
                await AvaDexie.deleteDatabase();

                // delete any local OPFS data
                await clearOPFS();
                notifySuccess({
                  title: "Local data deleted",
                  message:
                    "All local Avandar data has been deleted. Please refresh the page.",
                });
              },
            },

            {
              id: "list-duckdb-tables",
              label: "List DuckDB tables",
              description: "List all DuckDB tables",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                const tableNames = await DuckDBClient.getTableNames();
                Logger.log("Table names", tableNames.join("; "));
                notifySuccess({
                  title: "Check the console",
                  message: "DuckDB tables have been printed to the console.",
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
