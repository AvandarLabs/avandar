import { Button, Group, Stack } from "@mantine/core";
import { useState } from "react";
import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock";
import type { ReactNode } from "react";

export type SqlQueryEditPanelProps = {
  initialSql: string;
  submitButtonLabel: string;
  cancelButtonLabel: string;
  minRows?: number;
  onSubmit: (sql: string) => void;
  onCancel: () => void;
};

/**
 * Editable SQL panel with submit/cancel actions and dirty-state gating. Uses
 * {@link AvaSqlBlock} so pills stay consistent with read-only previews and
 * remain interactive while editing.
 */
export function SqlQueryEditPanel({
  initialSql,
  submitButtonLabel,
  cancelButtonLabel,
  minRows = 6,
  onSubmit,
  onCancel,
}: SqlQueryEditPanelProps): ReactNode {
  const [draftSql, setDraftSql] = useState(initialSql);
  const trimmedInitial = initialSql.trim();
  const trimmedDraft = draftSql.trim();
  const isDirty = trimmedDraft !== trimmedInitial;
  const canSubmit = isDirty && trimmedDraft.length > 0;

  return (
    <Stack gap="sm">
      <AvaSqlBlock
        key={initialSql}
        value={draftSql}
        onChange={setDraftSql}
        minRows={minRows}
      />
      <Group justify="flex-end" gap="xs">
        <Button
          size="sm"
          variant="default"
          disabled={!canSubmit}
          onClick={() => {
            onSubmit(trimmedDraft);
          }}
        >
          {submitButtonLabel}
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => {
            onCancel();
          }}
        >
          {cancelButtonLabel}
        </Button>
      </Group>
    </Stack>
  );
}
