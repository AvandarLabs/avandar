import { Stack, Text, ThemeIcon, Title } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/AppSlateEmptyState/AppSlateEmptyState.module.css";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  message: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Instructional empty slate used when a master-detail view has nothing
 * selected, or a workspace surface has no records yet.
 *
 * It sits flush on whichever surface the region behind it paints, with no
 * card of its own. The region is already the object; a bordered box inside
 * it would draw an edge with the same fill on both sides, which reads as a
 * seam rather than as lift. The 48px of air, the 720px measure, and the
 * centered icon are what mark this as a state rather than as content.
 */
export function AppSlateEmptyState({
  title,
  message,
  icon,
  action,
  className,
}: Readonly<Props>): ReactNode {
  return (
    <Stack
      align="center"
      className={clsx(css.emptyState, className)}
      gap="lg"
      maw={720}
      mx="auto"
      p="xxl"
      ta="center"
    >
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
  );
}
