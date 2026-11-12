import { ActionIcon } from "@avandar/ui";
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, TagsInput, Text, TextInput } from "@mantine/core";
import { IconArrowsLeftRight, IconTrash } from "@tabler/icons-react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import { CodePairDragHandle } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairDragHandle";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode, Ref } from "react";

/** A pair's validation problem or warning, with the copy that explains it. */
export type CodePairIssue = {
  type: DataDictionary.DraftIssue["type"] | DataDictionary.DraftWarning["type"];
  message: string;
  /** An error blocks saving. A warning, such as a missing label, does not. */
  severity: "error" | "warning";
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
  /** Called once the handle has taken focus, so the request is not reused. */
  onHandleFocused: () => void;
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
  }>,
): boolean {
  const { issue, input } = options;
  if (issue?.severity !== "error") {
    return false;
  }
  if (input === "code") {
    return (
      issue.type === "code_not_unique" || issue.type === "code_pair_incomplete"
    );
  }
  return issue.type === "label_not_unique";
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

/** Whether a pair issue is a warning about the label input. */
function _isWarningOnLabel(
  options: Readonly<{
    issue: CodePairIssue | undefined;
    input: "code" | "label";
  }>,
): boolean {
  return options.issue?.severity === "warning" && options.input === "label";
}

/**
 * Mantine owns aria-invalid and aria-describedby on its inputs. Passing the
 * message as `error` sets both, and the element it renders is hidden because
 * the row shows the same message on its own issue line. A warning is not an
 * error, so it goes in as the input's description instead, hidden the same
 * way, and the label input still reads it without being marked invalid.
 */
function _buildIssueProps(
  options: Readonly<{
    issue: CodePairIssue | undefined;
    input: "code" | "label";
  }>,
): {
  error: string | undefined;
  errorProps: { className?: string };
  description: string | undefined;
  descriptionProps: { className?: string };
} {
  return {
    error: _isIssueOnInput(options) ? options.issue?.message : undefined,
    errorProps: { className: css.codeListEditorIssueDescription },
    description: _isWarningOnLabel(options)
      ? options.issue?.message
      : undefined,
    descriptionProps: { className: css.codeListEditorIssueDescription },
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
        {..._buildIssueProps({ issue, input: "code" })}
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
        {..._buildIssueProps({ issue, input: "label" })}
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

type BodyProps = Props & {
  liRef?: Ref<HTMLLIElement>;
  isDragging: boolean;
  hasHandle: boolean;
  renderHandle: (valueName: string) => ReactNode;
};

function CodePairRowBody(props: Readonly<BodyProps>): ReactNode {
  const { pair, index, canEdit, issue, liRef, isDragging } = props;
  const { t } = useLingui();
  const rowNumber = index + 1;
  const fallbackName = t`value ${rowNumber}`;
  const valueName = pair.label.trim() || pair.code.trim() || fallbackName;

  return (
    <li
      ref={liRef}
      className={css.codeListEditorRow}
      data-dragging={isDragging}
      data-has-handle={props.hasHandle}
      aria-label={valueName}
    >
      {props.renderHandle(valueName)}
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
        // The issue is also an input's accessible description, so its line
        // is hidden from assistive tech.
        <Text
          size="xs"
          aria-hidden
          c={issue.severity === "error" ? "danger" : "dimmed"}
          className={css.codeListEditorRowIssue}
        >
          {issue.message}
        </Text>
      ) : null}
    </li>
  );
}

/** A row of an ordered list that can be edited, so it can be reordered. */
function SortableCodePairRow(props: Readonly<Props>): ReactNode {
  const { ref, handleRef, isDragging } = useSortable({
    id: props.sortableId,
    index: props.index,
  });

  return (
    <CodePairRowBody
      {...props}
      liRef={ref}
      isDragging={isDragging}
      hasHandle
      renderHandle={(valueName) => {
        return (
          <CodePairDragHandle
            valueName={valueName}
            handleRef={handleRef}
            isDragging={isDragging}
            shouldFocus={props.shouldFocusHandle}
            onFocused={props.onHandleFocused}
            onMoveByOffset={props.onMoveByOffset}
          />
        );
      }}
    />
  );
}

/**
 * One value in a code list: its code, a two-way arrow, its label, the other
 * spellings that also mean it, and whether it stands for a missing answer.
 * Every control is named after its row number, so a screen reader user
 * knows which value they are in.
 *
 * Only rows that can be reordered register as sortable. A sortable row
 * without a drag handle would make its whole `li` a focusable button around
 * the inputs, so the other rows stay plain list items.
 */
export function CodePairRow(props: Readonly<Props>): ReactNode {
  if (props.isOrdered && props.canEdit) {
    return <SortableCodePairRow {...props} />;
  }
  return (
    <CodePairRowBody
      {...props}
      isDragging={false}
      hasHandle={false}
      renderHandle={() => {
        return null;
      }}
    />
  );
}
