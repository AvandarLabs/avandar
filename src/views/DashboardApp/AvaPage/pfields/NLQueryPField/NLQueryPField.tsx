import {
  Alert,
  Button,
  Fieldset,
  Group,
  List,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Tabs, TextareaForm } from "@ui";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { mantineColorVar } from "@/lib/utils/browser/css";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm";
import { useNLPQuery } from "@/views/DataExplorerApp/QueryForm/useNLPQuery";
import { useDashboardManualQueryState } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/useDashboardManualQueryState";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";

export type NLQuery = {
  /**
   * The current prompt for the query. This may be different from the latest
   * generation if the user has edited the prompt since then.
   */
  prompt: string;

  /**
   * The raw SQL for the query. This may be different from the latest generation
   * if the user has edited the SQL since then.
   */
  rawSql: string;

  /**
   * An array of all previous generations of the query. This array is not user
   * editable, it serves as a history of every prompt & SQL generation so the
   * user can always revert to a previous generation if they want to.
   */
  generations: ReadonlyArray<
    | {
        prompt: string;
        rawSql: string;
        error?: undefined;
      }
    | {
        prompt: string;
        rawSql: undefined;
        error: string;
      }
  >;
};

type Props = AvaPageFieldProps<NLQuery>;

export function NLQueryPField({ value, onChange }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [generateAndRunQuery, isRunningQuery] = useNLPQuery({
    workspaceId: workspace.id,
    onSuccess: (sql, mutationVars) => {
      onChange({
        ...value,
        rawSql: sql,
        generations: [
          ...value.generations,
          {
            prompt: mutationVars.prompt,
            rawSql: sql,
          },
        ],
      });
    },
  });
  const { prompt, rawSql } = value;

  const manualState = useDashboardManualQueryState({
    rawSql,
    onRawSqlChange: (nextSql) => {
      onChange({ ...value, rawSql: nextSql });
    },
  });

  return (
    <Tabs
      indicatorVariant="floating"
      tabIds={["prompt", "manual-query", "sql"] as const}
      renderTabHeader={{
        prompt: "Prompt",
        "manual-query": "Manual",
        sql: "SQL",
      }}
      px="xs"
      py="sm"
      renderTabPanel={{
        prompt: () => {
          return (
            <PromptTabPanel
              prompt={prompt}
              isRunningQuery={isRunningQuery}
              onSubmitPrompt={(promptStr) => {
                onChange({ ...value, prompt: promptStr });
                if (promptStr) {
                  generateAndRunQuery({ prompt: promptStr });
                }
              }}
            />
          );
        },
        "manual-query": () => {
          if (!manualState.isParserReady) {
            return (
              <Text size="sm" c="dimmed" px="sm">
                Loading datasets…
              </Text>
            );
          }
          return (
            <ManualQueryForm
              query={manualState.query}
              isStructuredQueryInSync={manualState.isStructuredQueryInSync}
              handlers={manualState.handlers}
              withinPortal
            />
          );
        },
        sql: () => {
          return (
            <SqlTabPanel
              rawSql={rawSql}
              isStructuredQueryInSync={manualState.isStructuredQueryInSync}
              sqlSyncWarnings={manualState.sqlSyncWarnings}
              onSubmitSql={(nextSql) => {
                onChange({ ...value, rawSql: nextSql });
              }}
            />
          );
        },
      }}
    />
  );
}

function PromptTabPanel({
  prompt,
  isRunningQuery,
  onSubmitPrompt,
}: {
  prompt: string;
  isRunningQuery: boolean;
  onSubmitPrompt: (prompt: string) => void;
}): JSX.Element {
  return (
    <Stack gap="sm" px="sm">
      <TextareaForm
        asField
        defaultValue={prompt}
        description="Enter your question or instructions in natural language to generate a SQL query"
        label="Prompt"
        minRows={4}
        autosize
        isSubmitting={isRunningQuery}
        submitButtonLabel="Generate Query"
        styles={{
          input: {
            fontFamily: "monospace",
          },
        }}
        onSubmit={(promptStr) => {
          onSubmitPrompt(promptStr.trim());
        }}
      />
    </Stack>
  );
}

function SqlTabPanel({
  rawSql,
  isStructuredQueryInSync,
  sqlSyncWarnings,
  onSubmitSql,
}: {
  rawSql: string;
  isStructuredQueryInSync: boolean;
  sqlSyncWarnings: readonly string[];
  onSubmitSql: (nextSql: string) => void;
}): JSX.Element {
  const [isEditSQLMode, setIsEditSQLMode] = useState(false);

  return (
    <Stack gap="sm" px="sm">
      {!isStructuredQueryInSync && sqlSyncWarnings.length > 0 ?
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          variant="light"
          title="Manual form shows an approximation"
          data-testid="sql-sync-warning"
        >
          <Text size="xs" mb="xs">
            Parts of this SQL could not be represented in the Manual form. The
            form shows a best-effort approximation; the SQL above is what
            actually runs.
          </Text>
          <List size="xs" spacing={2}>
            {sqlSyncWarnings.map((reason) => {
              return <List.Item key={reason}>{reason}</List.Item>;
            })}
          </List>
        </Alert>
      : null}
      <Fieldset
        legend={
          <Group justify="space-between" style={{ width: "100%" }}>
            <span>Generated SQL</span>
            {!isEditSQLMode && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  setIsEditSQLMode(true);
                }}
              >
                Edit query
              </Button>
            )}
          </Group>
        }
        style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
      >
        <Stack gap="sm">
          {isEditSQLMode ?
            <TextareaForm
              // use the rawSQL as the key to force the textarea form to
              // re-initialize when we re-run a query, so we can properly
              // detect dirty state
              key={rawSql}
              asField
              defaultValue={rawSql}
              minRows={6}
              autosize
              showSubmitButton={true}
              showCancelButton={true}
              submitButtonLabel="Save and re-run query"
              cancelButtonLabel="Cancel"
              isSubmitting={false}
              styles={{
                input: {
                  fontFamily: "monospace",
                },
              }}
              validateOnChange={true}
              required={true}
              disabledUntilDirty={true}
              onSubmit={(newRawSQL) => {
                const trimmedSQL = newRawSQL.trim();
                setIsEditSQLMode(false);
                onSubmitSql(trimmedSQL);
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
              <Textarea
                value={rawSql}
                readOnly
                minRows={6}
                autosize
                styles={{
                  input: {
                    fontFamily: "monospace",
                    backgroundColor: "transparent",
                    border: "none",
                    padding: 0,
                  },
                }}
              />
            </Paper>
          }
        </Stack>
      </Fieldset>
    </Stack>
  );
}
