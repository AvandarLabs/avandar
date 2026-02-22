import { Button, Fieldset, Group, Paper, Stack, Textarea } from "@mantine/core";
import { useState } from "react";
import { useNLPQuery } from "@/components/DataExplorerApp/QueryForm/useNLPQuery";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { TextareaForm } from "@/lib/ui/singleton-forms/TextareaForm/TextareaForm";
import { mantineColorVar } from "@/lib/utils/browser/css";
import type { DashboardFieldProps } from "../../DashboardPuck.types";

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

type Props = DashboardFieldProps<NLQuery>;

export function NLQueryField({ value, onChange }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [isEditSQLMode, setIsEditSQLMode] = useState(false);
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

  return (
    <Stack gap="sm">
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
          const trimmedPrompt = promptStr.trim();
          onChange({
            ...value,
            prompt: trimmedPrompt,
          });
          if (trimmedPrompt) {
            generateAndRunQuery({ prompt: trimmedPrompt });
          }
        }}
      />

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
                onChange({
                  ...value,
                  rawSql: trimmedSQL,
                });
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
