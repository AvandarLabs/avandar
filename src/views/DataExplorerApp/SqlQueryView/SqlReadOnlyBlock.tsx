import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Group, Paper, Stack } from "@mantine/core";

import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock/AvaSqlBlock";
import css from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView.module.css";

type Props = {
  /** SQL to display, already formatted for reading. */
  displaySql: string;

  /** Minimum visible rows of the editor. */
  minRows: number;

  /** Called when the user asks to edit the query. */
  onEdit: () => void;
};

/** Read-only view of the current SQL, with the affordance to start editing. */
export function SqlReadOnlyBlock({
  displaySql,
  minRows,
  onEdit,
}: Props): ReactNode {
  return (
    <Stack gap="xs">
      <Paper p="sm" className={css.sqlPaper}>
        <AvaSqlBlock
          value={displaySql}
          readOnly
          minRows={minRows}
          data-testid="sql-query-view-editor"
        />
      </Paper>
      <Group justify="flex-end" className={css.editQueryRow}>
        <Button size="xs" variant="subtle" onClick={onEdit}>
          <Trans>Edit query</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
