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

export function useSpotlightActions(): Array<
  SpotlightActionData | SpotlightActionGroupData
> {
  const router = useRouter();
  const spotlightActions = useMemo(() => {
    return R.entries(AppConfig.links)
      .map(
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
      )
      .concat([
        {
          group: "Todos",
          actions: [
            {
              id: "data-import-todos",
              label: "Data Import Todos",
              description: "Show the to-dos for the Data Import app",
              onClick: () => {
                modals.open({
                  title: "Data Import Todos",
                  children: (
                    <Container>
                      <List type="ordered" withPadding>
                        <List.Item>Load data into in-browser SQL</List.Item>
                        <List.Item>Add a basic query tool</List.Item>
                        <List.Item>Show a table visualization</List.Item>
                        <List.Item>Show a bar graph visualization</List.Item>
                        <List.Item>Allow saving to a dashboard</List.Item>
                      </List>
                    </Container>
                  ),
                });
              },
              leftSection: <IconClipboard size={24} stroke={1.5} />,
            },
          ],
        },
      ]);
  }, [router]);
  return spotlightActions;
}
