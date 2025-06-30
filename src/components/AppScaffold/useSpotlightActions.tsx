import { notifications } from "@mantine/notifications";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import { LocalDatasetQueryClient } from "@/clients/LocalDatasetQueryClient";
import { Logger } from "@/lib/Logger";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";

export function useSpotlightActions(): Array<
  SpotlightActionData | SpotlightActionGroupData
> {
  const spotlightActions = useMemo(() => {
    if (import.meta.env.DEV) {
      const devActions = [
        {
          group: "Dev Actions",
          actions: [
            {
              id: "delete-local-datasets-indexed-db",
              label: "Delete Local Datasets",
              description: "Delete Local Datasets indexedDB database",
              leftSection: <IconTrash size={24} stroke={1.5} />,
              onClick: async () => {
                await LocalDatasetClient.deleteDatabase();
                notifications.show({
                  title: "Local Datasets deleted",
                  message:
                    "Local Datasets indexedDB database deleted. Please refresh the page.",
                  color: "green",
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

      return devActions;
    }

    return [];
  }, []);

  return spotlightActions;
}
