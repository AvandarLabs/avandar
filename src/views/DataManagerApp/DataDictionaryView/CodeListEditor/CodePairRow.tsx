import { ActionIcon } from "@avandar/ui";
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, TagsInput, Text, TextInput } from "@mantine/core";
import { IconArrowsLeftRight, IconTrash } from "@tabler/icons-react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import { CodePairDragHandle } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairDragHandle";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

/** A pair's validation problem, with the copy that explains it. */
export type CodePairIssue = {
  type: DataDictionary.DraftIssue["type"];
  message: string;
};

type Props = {
  /** A stable key for the sortable, since pairs have no id. */
  sortableId: string;
  pair: DataDictionaryCodeList.Pair;
  index: number;
  isOrdered: boolean;
  canEdit: boolean;
  /** Focuses the drag handle when the row mounts, after a reorder. */
  shouldFocusHandle: boolean;
  issue: CodePairIssue | undefined;
  onChange: (pair: DataDictionaryCodeList.Pair) => void;
  onRemove: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
};

type FieldsProps = Pick<Props, "pair" | "canEdit" | "onChange" | "onRemove"> & {
  rowNumber: number;
  valueName: string;
  issue: CodePairIssue | undefined;
};

/** Which input a pair issue is about. */
function _isIssueOnInput(
  options: Readonly<{
    issue: CodePairIssue | undefined;
    input: "code" | "label";
    pair: DataDictionaryCodeList.Pair;
  }>,
): boolean {
  const { issue, input, pair } = options;
  if (input === "code") {
    return (
      issue?.type === "code_not_unique" ||
      (issue?.type === "code_pair_incomplete" && !pair.code.trim())
    );
  }
  return (
    issue?.type === "label_not_unique" ||
    (issue?.type === "code_pair_incomplete" && !pair.label.trim())
  );
}

/** The other spellings, missing switch, and remove button of a value. */
function CodePairOptions({
  pair,
  canEdit,
  onChange,
  onRemove,
  rowNumber,
  valueName,
}: Readonly<Omit<FieldsProps, "issue">>): ReactNode {
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

/**
 * Mantine owns aria-invalid and aria-describedby on its inputs. Passing the
 * message as `error` sets both, and the element it renders is hidden because
 * the row shows the same message on its own issue line.
 */
function _buildIssueProps(
  options: Readonly<{
    issue: CodePairIssue | undefined;
    input: "code" | "label";
    pair: DataDictionaryCodeList.Pair;
  }>,
): { error: string | undefined; errorProps: { className?: string } } {
  return {
    error: _isIssueOnInput(options) ? options.issue?.message : undefined,
    errorProps: { className: css.codeListEditorIssueDescription },
  };
}

function CodePairFields(props: Readonly<FieldsProps>): ReactNode {
  const { pair, canEdit, onChange, issue } = props;
  const { t } = useLingui();
  const rowNumber = props.rowNumber;

  return (
    <>
      <TextInput
        aria-label={t`Code ${rowNumber}`}
        {..._buildIssueProps({ issue, input: "code", pair })}
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
        {..._buildIssueProps({ issue, input: "label", pair })}
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
        onRemove={props.onRemove}
        rowNumber={rowNumber}
        valueName={props.valueName}
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
  const { sortableId, pair, index, isOrdered, canEdit, issue } = props;
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
          shouldFocus={props.shouldFocusHandle}
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
        issue={issue}
      />
      {issue ? (
        <Text
          size="xs"
          aria-hidden
          c="danger"
          className={css.codeListEditorRowIssue}
        >
          {issue.message}
        </Text>
      ) : null}
    </li>
  );
}
