import { Center, Stack, Text, Title } from "@mantine/core";
import { Paper } from "@/lib/ui/Paper";
import type { DashboardRead } from "@/models/Dashboard/Dashboard.types";

type Props = {
  readonly dashboard: DashboardRead | undefined;
};

export function DashboardEditorView({ dashboard }: Props): JSX.Element {
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
    </Stack>
  );
}
