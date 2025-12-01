import { Button, Fieldset, Group, Paper, Stack, Textarea } from "@mantine/core";
import { useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { notifyError } from "@/lib/ui/notifications/notify";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DataExplorerStore } from "../DataExplorerStore";

export function LLMQueryForm(): JSX.Element {
  const [prompt, setPrompt] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState<string | undefined>(
    undefined,
  );
  const [, dispatch] = DataExplorerStore.use();
  const workspace = useCurrentWorkspace();

  const [generateQuery, isGenerating] = useMutation({
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
      setGeneratedSQL(sql);
    },
  });

  const promptToSend = prompt.trim();

  // TODO(jpsyx): create a TextareaForm like we have for InputTextForm, and use
  // that singleton form here.
  return (
    <Stack gap="md">
      <Fieldset
        legend="Describe your query"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
      >
        <Stack gap="sm">
          <Textarea
            label="Natural language prompt"
            placeholder="e.g., Show me all customers from California with orders over $1000"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.currentTarget.value);
            }}
            minRows={4}
            autosize
            styles={{
              input: {
                fontFamily: "monospace",
              },
            }}
          />
          <Group justify="flex-end">
            <Button
              onClick={() => {
                if (promptToSend.length === 0) {
                  notifyError("Prompt cannot be empty");
                } else {
                  generateQuery({
                    prompt: promptToSend,
                    workspaceId: workspace.id,
                  });
                }
              }}
              loading={isGenerating}
              disabled={isGenerating || promptToSend.length === 0}
            >
              Generate Query
            </Button>
          </Group>
        </Stack>
      </Fieldset>

      {generatedSQL === undefined ? null : (
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
                value={generatedSQL}
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
            <Group justify="flex-end">
              <Button
                onClick={() => {
                  dispatch.setRawSQL(generatedSQL);
                }}
              >
                Run Query
              </Button>
            </Group>
          </Stack>
        </Fieldset>
      )}
    </Stack>
  );
}
