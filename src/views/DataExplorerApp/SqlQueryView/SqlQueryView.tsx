import { Button, Fieldset, Group, Paper, Stack, Text, Textarea } from "@mantine/core";
import { TextareaForm } from "@ui";
import { useState } from "react";
import { mantineColorVar } from "@/lib/utils/browser/css";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

/**
 * Read-only view of the current SQL with an "Edit query" affordance that
 * swaps the textarea into edit mode and re-runs the query on submit. Reads
 * `rawSQL` from `DataExplorerStateManager` so it stays in sync regardless of
 * whether the SQL came from the chat panel, the manual query form, or a
 * saved dataset.
 */
export function SqlQueryView(): JSX.Element {
  const [{ rawSQL }, dispatch] = DataExplorerStateManager.useContext();
  const [isEditMode, setIsEditMode] = useState(false);

  if (rawSQL === undefined) {
    return (
      <Stack gap="xs" px="sm">
        <Text size="sm" c="neutral.6">
          No SQL yet. Ask Avandar a question or build a query in the Manual
          tab to generate SQL.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md" px="sm">
      <Fieldset
        legend={
          <Group justify="space-between" style={{ width: "100%" }}>
            <span>Generated SQL</span>
            {isEditMode ? null : (
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
                dispatch.setRawSql(trimmedValue);
                setIsEditMode(false);
              }}
              onCancel={() => {
                setIsEditMode(false);
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
    </Stack>
  );
}
