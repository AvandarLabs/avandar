import { Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useState } from "react";
import { mantineColorVar } from "@/lib/utils/browser/css";
import type { Dashboard } from "@/models/Dashboard";

type Props = {
  dashboard: Dashboard;
  onClick?: () => void;
};

export function DashboardCard({ dashboard, onClick }: Props): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  const onMouseEnter = () => {
    setIsHovered(true);
  };

  const onMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Card
      p="xl"
      radius="md"
      withBorder
      shadow={isHovered ? "lg" : "md"}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      styles={{
        root: {
          cursor: onClick ? "pointer" : "default",
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
          borderColor:
            isHovered ?
              mantineColorVar("primary.3")
            : mantineColorVar("gray.3"),
          transition:
            "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
        },
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon radius="md" size={40} variant="light">
              <IconLayoutDashboard size={22} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={650} size="lg" lineClamp={1}>
                {dashboard.name}
              </Text>
              <Text c="dimmed" size="sm" lineClamp={2}>
                {dashboard.description ?? "No description has been added yet."}
              </Text>
            </Stack>
          </Group>
        </Group>

        <Text c="dimmed" size="xs">
          Updated {_formatDashboardDate(dashboard.updatedAt)}
        </Text>
      </Stack>
    </Card>
  );
}

function _formatDashboardDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
