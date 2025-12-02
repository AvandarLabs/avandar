import { Fieldset, Paper, Stack, Textarea } from "@mantine/core";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { TextAreaForm } from "@/lib/ui/singleton-forms/TextAreaForm";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DataExplorerStore } from "../DataExplorerStore";

export function LLMQueryForm(): JSX.Element {
  const [{ rawSQL }, dispatch] = DataExplorerStore.use();
  const workspace = useCurrentWorkspace();

  const [generateAndRunQuery, isRunningQuery] = useMutation({
    mutationFn: async (options: {
      prompt: string;
      workspaceId: WorkspaceId;
    }) => {
      const datasets = await DatasetClient.getAll();
      const firstDataset = datasets[0];
      if (!firstDataset) {
        throw new Error("No datasets found");
      }
      const { sql } = await APIClient.get({
        route: "queries/:workspaceId/generate",
        pathParams: {
          workspaceId: firstDataset.workspaceId,
        },
        queryParams: {
          prompt: options.prompt,
        },
      });
      return sql;
    },
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
          <TextAreaForm
            defaultValue=""
            description="Enter your question or instructions in natural language to generate a SQL query"
            label="Prompt"
            placeholder="e.g., Show me all customers from California with orders over $1000"
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
                workspaceId: workspace.id,
              });
            }}
          />
        </Stack>
      </Fieldset>

      {rawSQL === undefined ? null : (
        <Fieldset
          legend="Generated SQL"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
        >
          <Stack gap="sm">
            <Paper
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
          </Stack>
        </Fieldset>
      )}
    </Stack>
  );
}
