import { Container, List } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconClipboard } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { LocalDatasetClient } from "@/clients/LocalDatasetClient";
import { AppConfig } from "@/config/AppConfig";
import { TODOS } from "@/config/todos";
import { objectEntries } from "@/utils/objects";

export function useSpotlightActions(): Array<
  SpotlightActionData | SpotlightActionGroupData
> {
  const router = useRouter();
  const spotlightActions = useMemo(() => {
    const actions = objectEntries(AppConfig.links).map(
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
      ];

      const devTodos = TODOS?.map((devTodo) => {
        return {
          id: devTodo.id,
          label: devTodo.label,
          description: devTodo.description,
          leftSection: <IconClipboard size={24} stroke={1.5} />,
          onClick: () => {
            modals.open({
              title: devTodo.label,
              children: (
                <Container>
                  <List type="ordered" withPadding>
                    {devTodo.items.map((todoItem) => {
                      return <List.Item key={todoItem}>{todoItem}</List.Item>;
                    })}
                  </List>
                </Container>
              ),
            });
          },
        };
      });

      return devTodos ?
          actions.concat(devActions, [
            { group: "Dev Todos", actions: devTodos },
          ])
        : actions.concat(devActions);
    }

    return actions;
  }, [router]);
  return spotlightActions;
}
