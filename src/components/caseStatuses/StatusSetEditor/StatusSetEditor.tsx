import { noop } from "@avandar/utils";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useId } from "react";
import { makeStatusSetEditorActions } from "@/components/caseStatuses/StatusSetEditor/makeStatusSetEditorActions";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import { StatusSetEditorRow } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditorRow";
import { useStatusSetIssueMessages } from "@/components/caseStatuses/StatusSetEditor/useStatusSetIssueMessages";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusReplacements } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

const NO_SAVED_STATUSES: readonly ConceptStatus.T[] = [];
const NO_RECORD_COUNTS: Partial<Record<ConceptStatus.Id, number>> = {};
const NO_REPLACEMENTS: StatusReplacements = {};

type Props = {
  /** The statuses being edited, in display order, and the default. */
  value: ConceptStatus.SetValue;

  onChange: (value: ConceptStatus.SetValue) => void;

  /** Edit mode: the statuses as saved. Leave unset when creating. */
  savedStatuses?: readonly ConceptStatus.T[];

  /** Edit mode: how many records hold each saved status. */
  recordCounts?: Partial<Record<ConceptStatus.Id, number>>;

  /** Edit mode: where each removed saved status's records move. */
  replacements?: StatusReplacements;

  onReplacementsChange?: (replacements: StatusReplacements) => void;
};

/**
 * Edits a case type's statuses: their order, color, name, and description,
 * and which one new records start in.
 *
 * It is controlled: every edit reports a whole new set value and nothing is
 * kept inside. Problems are shown where they can be fixed, never as a
 * blocking dialog, and the caller decides whether the set can be saved with
 * `ConceptStatus.findSetIssues`. In edit mode it also receives the saved
 * statuses and their record counts, so a removed status that still has
 * records can ask where those records go.
 */
export function StatusSetEditor({
  value,
  onChange,
  savedStatuses = NO_SAVED_STATUSES,
  recordCounts = NO_RECORD_COUNTS,
  replacements = NO_REPLACEMENTS,
  onReplacementsChange = noop,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const radioName = useId();
  const actions = makeStatusSetEditorActions({
    value,
    onChange,
    replacements,
    onReplacementsChange,
  });
  const issueMessages = useStatusSetIssueMessages({
    value,
    savedStatuses,
    recordCounts,
    replacements,
  });

  return (
    <Stack gap="sm" className={css.statusSetEditor}>
      <DragDropProvider
        onDragEnd={(event) => {
          actions.reorderStatuses(move([...value.statuses], event));
        }}
      >
        <div role="radiogroup" aria-label={t`Default status`}>
          <ul className={css.statusSetEditorList}>
            {value.statuses.map((status, index) => {
              return (
                <StatusSetEditorRow
                  key={status.id}
                  status={status}
                  index={index}
                  isDefault={status.id === value.defaultStatusId}
                  radioName={radioName}
                  nameError={issueMessages.byStatusId[status.id]}
                  actions={actions}
                />
              );
            })}
          </ul>
        </div>
      </DragDropProvider>
      {issueMessages.forSet.map((message) => {
        return (
          <Text key={message} size="sm" c="danger" role="alert">
            {message}
          </Text>
        );
      })}
      <div>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={actions.addStatus}
        >
          <Trans>Add status</Trans>
        </Button>
      </div>
    </Stack>
  );
}
