import { mantineColorVar } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Button,
  Fieldset,
  Group,
  List,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { sqlMappingReasonLabel } from "$/copy/sqlMappingReasonLabel";
import { sqlMappingReasonKey } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlMappingReason.types";
import { useState } from "react";
import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock/AvaSqlBlock";
import { SqlQueryEditPanel } from "@/components/sql/SqlEditor/SqlQueryEditPanel";
import type { SqlMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlMappingReason.types";
import type { ReactElement } from "react";

type Props = {
  rawSql: string;
  isStructuredQueryInSync: boolean;
  sqlSyncWarnings: readonly SqlMappingReason[];
  onSubmitSql: (nextSql: string) => void;
};

/** Shows generated SQL and lets the user edit it directly. */
export function SqlTabPanel({
  rawSql,
  isStructuredQueryInSync,
  sqlSyncWarnings,
  onSubmitSql,
}: Props): ReactElement {
  const { t } = useLingui();
  const [isEditSQLMode, setIsEditSQLMode] = useState(false);

  return (
    <Stack gap="sm" px="sm">
      {!isStructuredQueryInSync && sqlSyncWarnings.length > 0 ?
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          variant="light"
          title={t`Manual form shows an approximation`}
          data-testid="sql-sync-warning"
        >
          <Text size="xs" mb="xs">
            <Trans>
              Parts of this SQL could not be represented in the Manual form. The
              form shows a best-effort approximation; the SQL above is what
              actually runs.
            </Trans>
          </Text>
          <List size="xs" spacing={2}>
            {sqlSyncWarnings.map((reason) => {
              return (
                <List.Item key={sqlMappingReasonKey(reason)}>
                  {sqlMappingReasonLabel(reason)}
                </List.Item>
              );
            })}
          </List>
        </Alert>
      : null}
      <Fieldset
        legend={
          <Group justify="space-between" style={{ width: "100%" }}>
            <span>
              <Trans>Generated SQL</Trans>
            </span>
            {!isEditSQLMode && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  setIsEditSQLMode(true);
                }}
              >
                <Trans>Edit query</Trans>
              </Button>
            )}
          </Group>
        }
        style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
      >
        <Stack gap="sm">
          {isEditSQLMode ?
            <SqlQueryEditPanel
              initialSql={rawSql}
              submitButtonLabel={t`Save and re-run query`}
              cancelButtonLabel={t`Cancel`}
              onSubmit={(nextRawSql) => {
                setIsEditSQLMode(false);
                onSubmitSql(nextRawSql);
              }}
              onCancel={() => {
                setIsEditSQLMode(false);
              }}
            />
          : <Paper
              p="sm"
              style={{
                backgroundColor: mantineColorVar("gray.0"),
                border: `1px solid ${mantineColorVar("gray.3")}`,
              }}
            >
              <AvaSqlBlock value={rawSql} readOnly minRows={6} />
            </Paper>
          }
        </Stack>
      </Fieldset>
    </Stack>
  );
}
