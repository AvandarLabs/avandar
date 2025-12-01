import { Button, Stack, Textarea } from "@mantine/core";
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
    <Stack>
      <Textarea
        value={prompt}
        onChange={(event) => {
          setPrompt(event.currentTarget.value);
        }}
      />
      <Button
        onClick={() => {
          if (promptToSend.length === 0) {
            notifyError("Prompt cannot be empty");
          } else {
            generateQuery({ prompt: promptToSend, workspaceId: workspace.id });
          }
        }}
        loading={isGenerating}
        disabled={isGenerating || promptToSend.length === 0}
      >
        Generate
      </Button>
      {generatedSQL === undefined ? null : (
        <Textarea value={generatedSQL} readOnly />
      )}
      {generatedSQL === undefined ? null : (
        <Button
          onClick={() => {
            dispatch.setRawSQL(generatedSQL);
          }}
        >
          Run Query
        </Button>
      )}
    </Stack>
  );
}
