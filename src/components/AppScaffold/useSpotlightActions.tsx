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
import { TODOS } from "@/config/todos";

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
