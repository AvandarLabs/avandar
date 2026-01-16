import { Button, Fieldset, Group, Paper, Stack, Textarea } from "@mantine/core";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { TextareaForm } from "@/lib/ui/singleton-forms/TextareaForm/TextareaForm";
import { DataExplorerStore } from "../DataExplorerStore";
import { useNLPQuery } from "./useNLPQuery";

export function LLMQueryForm(): JSX.Element {
  const [{ rawSQL }, dispatch] = DataExplorerStore.use();
  const workspace = useCurrentWorkspace();
  const [isEditMode, setIsEditMode] = useState(false);

  const [generateAndRunQuery, isRunningQuery] = useNLPQuery({
    workspaceId: workspace.id,
    onSuccess: (sql) => {
      dispatch.setRawSQL(sql);
    },
  });

  return (
    <Stack gap="md">
      <Fieldset
        legend="Describe your query"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
      >
        <Stack gap="sm">
          <TextareaForm
            defaultValue=""
            description="Enter your question or instructions in natural language to generate a SQL query"
            label="Prompt"
            required
            minRows={4}
            autosize
            isSubmitting={isRunningQuery}
            submitButtonLabel="Run Query"
            styles={{
              input: {
                fontFamily: "monospace",
              },
            }}
            onSubmit={(value) => {
              generateAndRunQuery({
                prompt: value.trim(),
              });
            }}
          />
        </Stack>
      </Fieldset>

      {rawSQL === undefined ? null : (
        <Fieldset
          legend={
            <Group justify="space-between" style={{ width: "100%" }}>
              <span>Generated SQL</span>
              {!isEditMode && (
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    setIsEditMode(true);
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
            {isEditMode ?
              <TextareaForm
                // use the rawSQL as the key to force the textarea form to
                // re-initialize when we re-run a query, so we can properly
                // detect dirty state
                key={rawSQL}
                defaultValue={rawSQL}
                minRows={6}
                autosize
                showSubmitButton={true}
                showCancelButton={true}
                submitButtonLabel="Re-run query"
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
                onSubmit={(value) => {
                  const trimmedValue = value.trim();
                  dispatch.setRawSQL(trimmedValue);
                  setIsEditMode(false);
                }}
                onCancel={() => {
                  setIsEditMode(false);
                }}
              />
            : <Paper
                p="sm"
                style={{
                  backgroundColor: "var(--mantine-color-gray-0)",
                  border: "1px solid var(--mantine-color-gray-3)",
                }}
              >
                <Textarea
                  value={rawSQL}
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
      )}
    </Stack>
  );
}
