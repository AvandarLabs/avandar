import { Center, Stack, Text, Title } from "@mantine/core";
import { Puck } from "@puckeditor/core";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { Paper } from "@/lib/ui/Paper";
import type { DashboardRead } from "@/models/Dashboard/Dashboard.types";
import type { Config, Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useState } from "react";

type Props = {
  readonly dashboard: DashboardRead | undefined;
};

type HeadingBlockProps = {
  children: string;
};

type DashboardPuckData = Data<{
  HeadingBlock: HeadingBlockProps;
}>;

const PuckConfig: Config<{
  HeadingBlock: HeadingBlockProps;
}> = {
  components: {
    HeadingBlock: {
      fields: {
        children: {
          type: "text",
        },
      },
      render: ({ children }: HeadingBlockProps) => {
        return <h1>{children}</h1>;
      },
    },
  },
};

const EMPTY_DATA: DashboardPuckData = {
  root: { props: {} },
  content: [],
};

function onPublish(data: DashboardPuckData): void {
  console.log("onPublish", data);
  notifyDevAlert(data);
}

export function DashboardEditorView({ dashboard }: Props): JSX.Element {
  const [data, setData] = useState<DashboardPuckData>(EMPTY_DATA);

  return (
    <Stack gap="lg">
      <Paper>
        <Stack gap={4}>
          <Text c="dimmed" fz="sm">
            Dashboard
          </Text>
          <Title order={2}>{dashboard?.name ?? "Untitled dashboard"}</Title>
        </Stack>
      </Paper>

      <Paper mih={420} p="xl">
        <Center h="100%">
          <Stack gap={6} align="center">
            <Title order={4}>Dashboard is empty</Title>
            <Text c="dimmed" ta="center" maw={420}>
              Add your first chart to start building this dashboard.
            </Text>
          </Stack>
        </Center>
      </Paper>

      <Puck
        config={PuckConfig}
        data={data}
        onChange={setData}
        onPublish={onPublish}
      />
    </Stack>
  );
}
