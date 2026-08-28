import { Paper } from "@avandar/ui";
import { Stack, Text, ThemeIcon, Title } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/CanvasEmptyState/CanvasEmptyState.module.css";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  message: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Instructional empty canvas used when a master-detail view has nothing
 * selected, or a workspace surface has no records yet.
 */
export function CanvasEmptyState({
  title,
  message,
  icon,
  action,
  className,
}: Readonly<Props>): ReactNode {
  return (
    <Paper p="xxl" maw={720} mx="auto" className={clsx(css.panel, className)}>
      <Stack gap="lg" align="center" ta="center">
        {icon ? (
          <ThemeIcon size={64} radius="xl" variant="light">
            {icon}
          </ThemeIcon>
        ) : null}
        <Stack gap="xs">
          <Title order={2} fw={650}>
            {title}
          </Title>
          <Text c="dimmed">{message}</Text>
        </Stack>
        {action}
      </Stack>
    </Paper>
  );
}
