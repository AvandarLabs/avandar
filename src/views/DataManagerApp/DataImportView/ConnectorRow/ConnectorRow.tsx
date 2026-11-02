import { Group, Stack, Text } from "@mantine/core";
import css from "@/views/DataManagerApp/DataImportView/ConnectorRow/ConnectorRow.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The service's mark, drawn at 20px from the shared icon set. */
  icon: ReactNode;

  /** The service's own name. */
  name: ReactNode;

  /**
   * What connecting gets the user, or the account currently connected. One
   * line either way.
   */
  status: ReactNode;

  /** The single control that advances the connection. */
  action: ReactNode;
};

/**
 * One external source a workspace can import from: what it is, where it
 * stands, and the one thing to do next.
 *
 * The row is the unit a connectors list is built from, so adding a second
 * service is adding a row rather than inventing a second layout.
 */
export function ConnectorRow({
  icon,
  name,
  status,
  action,
}: Readonly<Props>): ReactNode {
  return (
    <Group gap="sm" wrap="nowrap" className={css.connectorRow}>
      <span className={css.connectorRowIcon}>{icon}</span>
      <Stack gap={0} className={css.connectorRowText}>
        <Text size="sm" fw={500}>
          {name}
        </Text>
        <Text size="xs" c="dimmed">
          {status}
        </Text>
      </Stack>
      <div className={css.connectorRowAction}>{action}</div>
    </Group>
  );
}
