import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconClipboard, IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { APP_CONFIG } from "@/config/AppConfig";
import { objectEntries } from "@/lib/utils/objects/misc";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { SpotlightTodoContainer } from "./SpotlightTodoContainer";

export function useSpotlightActions(): Array<
  SpotlightActionData | SpotlightActionGroupData
> {
  const router = useRouter();
  const spotlightActions = useMemo(() => {
    const actions = objectEntries(APP_CONFIG.links).map(
      ([linkKey, link]): SpotlightActionData | SpotlightActionGroupData => {
        return {
          id: linkKey,
          label: link.label,
          description: link.spotlightDescription,
          onClick: () => {
            router.navigate({ to: link.to });
          },
          leftSection: link.icon,
        };
      },
    );

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
          ],
        },
        {
          id: "dev-todos",
          label: "Dev Todos",
          description: "Show all to-dos for all apps",
          leftSection: <IconClipboard size={24} stroke={1.5} />,
          onClick: () => {
            modals.open({
              title: "Todo list",
              children: <SpotlightTodoContainer />,
            });
          },
        },
      ];

      return actions.concat(devActions);
    }

    return actions;
  }, [router]);
  return spotlightActions;
}
