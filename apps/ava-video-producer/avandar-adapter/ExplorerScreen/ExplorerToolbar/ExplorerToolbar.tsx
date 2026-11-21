import { Group, Text } from "@mantine/core";
import css from "./ExplorerToolbar.module.css";
import { ExplorerToolbarActions } from "./ExplorerToolbarActions";
import type { ReactNode } from "react";

/**
 * Fixture toolbar retains the product controls and fictional-data disclosure.
 */
export function ExplorerToolbar(): ReactNode {
  return (
    <Group
      bg="white"
      py="xs"
      w="100%"
      justify="flex-end"
      px="md"
      pos="relative"
      className={css.explorerToolbar}
    >
      <Text size="xs" c="neutral.6" className={css.explorerToolbarFictional}>
        Fictional demonstration data
      </Text>
      <ExplorerToolbarActions />
    </Group>
  );
}
