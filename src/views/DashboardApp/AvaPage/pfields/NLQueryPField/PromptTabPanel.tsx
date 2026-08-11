import { TextareaForm } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import type { ReactElement } from "react";

type Props = {
  prompt: string;
  isRunningQuery: boolean;
  onSubmitPrompt: (prompt: string) => void;
};

/** Lets the user generate SQL from a natural-language prompt. */
export function PromptTabPanel({
  prompt,
  isRunningQuery,
  onSubmitPrompt,
}: Props): ReactElement {
  const { t } = useLingui();
  return (
    <Stack gap="sm" px="sm">
      <TextareaForm
        asField
        defaultValue={prompt}
        description={t`Enter your question or instructions in natural language to generate a SQL query`}
        label={t`Prompt`}
        minRows={4}
        autosize
        isSubmitting={isRunningQuery}
        submitButtonLabel={t`Generate Query`}
        styles={{ input: { fontFamily: "monospace" } }}
        onSubmit={(promptString) => {
          onSubmitPrompt(promptString.trim());
        }}
      />
    </Stack>
  );
}
