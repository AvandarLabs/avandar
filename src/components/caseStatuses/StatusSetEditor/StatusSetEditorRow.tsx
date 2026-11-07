import { ActionIcon } from "@avandar/ui";
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { IconTrash } from "@tabler/icons-react";
import { StatusColorPicker } from "@/components/caseStatuses/StatusColorPicker/StatusColorPicker";
import { StatusDragHandle } from "@/components/caseStatuses/StatusSetEditor/StatusDragHandle";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import { StatusSetEditorFields } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditorFields";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusSetEditorActions } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  status: ConceptStatus.Draft;
  index: number;
  isDefault: boolean;
  radioName: string;
  nameError: string | undefined;
  actions: StatusSetEditorActions;
};

/**
 * One status in the editor: a reorder handle, its color, its name and
 * description, the default radio, and a remove button. Every control is
 * named after the status, so a screen reader user knows which row it is in.
 */
export function StatusSetEditorRow({
  status,
  index,
  isDefault,
  radioName,
  nameError,
  actions,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { ref, handleRef, isDragging } = useSortable({ id: status.id, index });
  const displayName = status.name.trim() || t`Untitled status`;

  return (
    <li
      ref={ref}
      className={css.statusSetEditorRow}
      data-dragging={isDragging}
      aria-label={displayName}
    >
      <StatusDragHandle
        statusName={displayName}
        handleRef={handleRef}
        isDragging={isDragging}
        onMoveByOffset={(offset) => {
          actions.moveStatus({ statusId: status.id, offset });
        }}
      />
      <div className={css.statusSetEditorColor}>
        <StatusColorPicker
          color={status.color}
          statusName={displayName}
          onChange={(color) => {
            actions.updateStatus({ ...status, color });
          }}
        />
      </div>
      <StatusSetEditorFields
        {...{ status, displayName, isDefault, radioName, nameError, actions }}
      />
      <div className={css.statusSetEditorRemove}>
        <ActionIcon
          variant="subtle"
          color="neutral"
          tooltip={t`Remove ${displayName}`}
          aria-label={t`Remove ${displayName}`}
          onClick={() => {
            actions.removeStatus(status.id);
          }}
        >
          <IconTrash size={14} aria-hidden />
        </ActionIcon>
      </div>
    </li>
  );
}
