import { ActionIcon } from "@avandar/ui";
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, TagsInput, Text, TextInput } from "@mantine/core";
import { IconArrowsLeftRight, IconTrash } from "@tabler/icons-react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import { CodePairDragHandle } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairDragHandle";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  /** A stable key for the sortable, since pairs have no id. */
  sortableId: string;
  pair: DataDictionaryCodeList.Pair;
  index: number;
  isOrdered: boolean;
  canEdit: boolean;
  issueMessage: string | undefined;
  onChange: (pair: DataDictionaryCodeList.Pair) => void;
  onRemove: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
};

type FieldsProps = Pick<Props, "pair" | "canEdit" | "onChange" | "onRemove"> & {
  rowNumber: number;
  valueName: string;
};

/** The other spellings, missing switch, and remove button of a value. */
function CodePairOptions({
  pair,
  canEdit,
  onChange,
  onRemove,
  rowNumber,
  valueName,
}: Readonly<FieldsProps>): ReactNode {
  const { t } = useLingui();

  return (
    <>
      <TagsInput
        aria-label={t`Other spellings of value ${rowNumber}`}
        placeholder={t`Also accept`}
        value={pair.acceptedSpellings}
        disabled={!canEdit}
        onChange={(acceptedSpellings) => {
          onChange({ ...pair, acceptedSpellings });
        }}
      />
      <Checkbox
        label={t`Missing`}
        checked={pair.isMissing}
        disabled={!canEdit}
        onChange={(event) => {
          onChange({ ...pair, isMissing: event.currentTarget.checked });
        }}
      />
      {canEdit ? (
        <ActionIcon
          variant="subtle"
          color="neutral"
          tooltip={t`Remove ${valueName}`}
          aria-label={t`Remove ${valueName}`}
          onClick={onRemove}
        >
          <IconTrash size={14} aria-hidden />
        </ActionIcon>
      ) : null}
    </>
  );
}

function CodePairFields({
  pair,
  canEdit,
  onChange,
  onRemove,
  rowNumber,
  valueName,
}: Readonly<FieldsProps>): ReactNode {
  const { t } = useLingui();

  return (
    <>
      <TextInput
        aria-label={t`Code ${rowNumber}`}
        value={pair.code}
        disabled={!canEdit}
        className={css.codeListEditorCode}
        onChange={(event) => {
          onChange({ ...pair, code: event.currentTarget.value });
        }}
      />
      <IconArrowsLeftRight
        size={14}
        aria-hidden
        className={css.codeListEditorArrow}
      />
      <TextInput
        aria-label={t`Label ${rowNumber}`}
        value={pair.label}
        disabled={!canEdit}
        onChange={(event) => {
          onChange({ ...pair, label: event.currentTarget.value });
        }}
      />
      <CodePairOptions
        pair={pair}
        canEdit={canEdit}
        onChange={onChange}
        onRemove={onRemove}
        rowNumber={rowNumber}
        valueName={valueName}
      />
    </>
  );
}

/**
 * One value in a code list: its code, a two-way arrow, its label, the other
 * spellings that also mean it, and whether it stands for a missing answer.
 * Every control is named after its row number, so a screen reader user
 * knows which value they are in.
 */
export function CodePairRow(props: Readonly<Props>): ReactNode {
  const { sortableId, pair, index, isOrdered, canEdit, issueMessage } = props;
  const { t } = useLingui();
  const { ref, handleRef, isDragging } = useSortable({
    id: sortableId,
    index,
    disabled: !isOrdered || !canEdit,
  });
  const rowNumber = index + 1;
  const valueName = pair.label.trim() || t`value ${rowNumber}`;

  return (
    <li
      ref={ref}
      className={css.codeListEditorRow}
      data-dragging={isDragging}
      aria-label={valueName}
    >
      {isOrdered && canEdit ? (
        <CodePairDragHandle
          valueName={valueName}
          handleRef={handleRef}
          isDragging={isDragging}
          onMoveByOffset={props.onMoveByOffset}
        />
      ) : null}
      <CodePairFields
        pair={pair}
        canEdit={canEdit}
        onChange={props.onChange}
        onRemove={props.onRemove}
        rowNumber={rowNumber}
        valueName={valueName}
      />
      {issueMessage ? (
        <Text
          size="xs"
          c="danger"
          role="alert"
          className={css.codeListEditorRowIssue}
        >
          {issueMessage}
        </Text>
      ) : null}
    </li>
  );
}
