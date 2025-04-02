import { Container, List } from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconClipboard } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import * as R from "remeda";
import { AppConfig } from "@/config/AppConfig";

/**
 * This variable is only used in dev mode as an easy way to display platform
 * todos in dev mode.
 */
const TODOS =
  import.meta.env.DEV ?
    [
      {
        id: "data-import-todos",
        label: "Data Import Todos",
        description: "Show the to-dos for the Data Import app",
        items: [
          "Rename Data Import to Data Manager",
          "Add ability to persist dataset into dexie",
          "Load data from dexie to DuckDB WASM",
          "Add a basic query tool to query the data",
          "Display the data in a table in Data Explorer",
          "Show a bar graph visualization",
          "Allow saving to a dashboard",
          "Allow basic management of datasets in Data Import",
        ],
      },
    ]
  : undefined;

export function useSpotlightActions(): Array<
  SpotlightActionData | SpotlightActionGroupData
> {
  const router = useRouter();
  const spotlightActions = useMemo(() => {
    const actions = R.entries(AppConfig.links).map(
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
          actions.concat([{ group: "Dev Todos", actions: devTodos }])
        : actions;
    }

    return actions;
  }, [router]);
  return spotlightActions;
}
