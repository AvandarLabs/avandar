import { prop } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import { RenameWarning } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/RenameWarning";
import { SaveErrorCallout } from "@/views/OntologyDesignerApp/ConceptMetaView/EditStatusesModal/EditStatusesForm/SaveErrorCallout";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  conceptId: Concept.Id;
  /** The saved statuses, in position order. */
  savedStatuses: readonly ConceptStatus.T[];
  defaultStatusId: ConceptStatus.Id;
  recordCounts: Partial<Record<ConceptStatus.Id, number>>;
  isSaving: boolean;
  /** The last save's failure, shown as translated copy. */
  saveError: unknown;
  onCancel: () => void;
  onSave: (payload: ConceptStatus.SavePayload) => void;
};

/**
 * Edits a saved case type's statuses. It starts from the saved set, keeps
 * the edits and the replacements for removed statuses, and only offers Save
 * once `ConceptStatus.findSetIssues` finds nothing to fix.
 */
export function EditStatusesForm({
  conceptId,
  savedStatuses,
  defaultStatusId,
  recordCounts,
  isSaving,
  saveError,
  onCancel,
  onSave,
}: Readonly<Props>): ReactNode {
  const [value, setValue] = useState<ConceptStatus.SetValue>(() => {
    return { statuses: ConceptStatus.toDrafts(savedStatuses), defaultStatusId };
  });
  const [replacements, setReplacements] = useState<StatusReplacements>({});
  const savedStatusIds = useMemo(() => {
    return savedStatuses.map(prop("id"));
  }, [savedStatuses]);
  const canSave =
    ConceptStatus.findSetIssues({
      value,
      recordCounts,
      savedStatusIds,
      replacements,
    }).length === 0;

  return (
    <Stack gap="md">
      <StatusSetEditor
        value={value}
        onChange={setValue}
        savedStatuses={savedStatuses}
        recordCounts={recordCounts}
        replacements={replacements}
        onReplacementsChange={setReplacements}
      />
      <RenameWarning savedStatuses={savedStatuses} statuses={value.statuses} />
      <SaveErrorCallout saveError={saveError} />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          loading={isSaving}
          disabled={!canSave}
          onClick={() => {
            onSave(
              ConceptStatus.buildSavePayload({
                conceptId,
                value,
                savedStatusIds,
                replacements,
              }),
            );
          }}
        >
          <Trans>Save statuses</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
