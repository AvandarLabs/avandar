import { Button, Group, Stack } from "@mantine/core";
import { useState } from "react";
import { SqlEditor } from "./SqlEditor.tsx";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types.ts";

export type SqlQueryEditPanelProps = {
  initialSql: string;
  catalog: SqlDisplayCatalog;
  submitButtonLabel: string;
  cancelButtonLabel: string;
  onSubmit: (sql: string) => void;
  onCancel: () => void;
};

/**
 * Editable SQL panel with submit/cancel actions and dirty-state gating.
 */
export function SqlQueryEditPanel({
  initialSql,
  catalog,
  submitButtonLabel,
  cancelButtonLabel,
  onSubmit,
  onCancel,
}: SqlQueryEditPanelProps): JSX.Element {
  const [draftSql, setDraftSql] = useState(initialSql);
  const trimmedInitial = initialSql.trim();
  const trimmedDraft = draftSql.trim();
  const isDirty = trimmedDraft !== trimmedInitial;
  const canSubmit = isDirty && trimmedDraft.length > 0;

  return (
    <Stack gap="sm">
      <SqlEditor
        key={initialSql}
        value={draftSql}
        onChange={setDraftSql}
        catalog={catalog}
        readOnly={false}
        minRows={6}
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
