import { Group, ActionIcon, Title } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconMessageCircle,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = { title: string };
/** Show the current feature title and the product toolbar affordances. */
export function AvandarToolbar({ title }: Readonly<Props>): ReactNode {
  return (
    <Group className="videoToolbar" gap="xs" px="xs" py="xxs">
      <ActionIcon variant="subtle" color="neutral" size="md">
        <IconLayoutSidebarLeftCollapse size={18} />
      </ActionIcon>
      <Title order={2} size="sm" fw={500}>
        {title}
      </Title>
      <Group ml="auto" gap="xs">
        <ActionIcon variant="subtle" color="neutral">
          <IconMessageCircle size={18} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
