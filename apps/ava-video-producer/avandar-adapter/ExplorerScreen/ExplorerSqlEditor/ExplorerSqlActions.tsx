import { noop } from "@avandar/utils";
import { Button, Group } from "@mantine/core";
import sqlCss from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView.module.css";
import type { ReactNode } from "react";

type Props = { sql: string; isEditingSql: boolean };
/** Display the product SQL editing actions with their original target tags. */
export function ExplorerSqlActions({
  sql,
  isEditingSql,
}: Readonly<Props>): ReactNode {
  return (
    <Group
      justify="flex-end"
      gap="xs"
      className={isEditingSql ? undefined : sqlCss.editQueryRow}
    >
      {isEditingSql ? (
        <>
          <Button
            data-video-target="explorer-run-query"
            size="sm"
            variant="default"
            disabled={sql.trim().length === 0}
            onClick={noop}
          >
            Re-run query
          </Button>
          <Button size="sm" variant="subtle" onClick={noop}>
            Cancel
          </Button>
        </>
      ) : (
        <Button
          data-video-target="explorer-edit-query"
          size="xs"
          variant="subtle"
          onClick={noop}
        >
          Edit query
        </Button>
      )}
    </Group>
  );
}
