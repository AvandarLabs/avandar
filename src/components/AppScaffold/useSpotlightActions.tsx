import { Container, List } from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconClipboard, IconHome, IconUpload } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";

export function useSpotlightActions(): Array<
  SpotlightActionData | SpotlightActionGroupData
> {
  const router = useRouter();
  const spotlightActions = useMemo(() => {
    return [
      {
        id: "home",
        label: "Home",
        description: "Go to home page",
        onClick: () => {
          router.navigate({
            to: AppConfig.links.home.to,
          });
        },
        leftSection: <IconHome size={24} stroke={1.5} />,
      },
      {
        id: "data-import",
        label: "Data Import",
        description: "Go to the data import app",
        onClick: () => {
          router.navigate({
            to: AppConfig.links.dataImport.to,
          });
        },
        leftSection: <IconUpload size={24} stroke={1.5} />,
      },
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
                      <List.Item>Allow CSV import</List.Item>
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
    ];
  }, []);
  return spotlightActions;
}
