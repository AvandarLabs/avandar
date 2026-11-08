import { useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Text, TextInput } from "@mantine/core";
import clsx from "clsx";
import { match } from "ts-pattern";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl/ValueShapeControl";
import css from "./CaseTypeDraftCard.module.css";
import { CaseTypeDraftValueRuleSelect } from "./CaseTypeDraftValueRuleSelect";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ChatProposedCaseAttribute } from "$/types/chat.types";
import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

type Props = {
  attribute: ChatProposedCaseAttribute;
  columnLabel: string;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  editor: CaseTypeDraftEditor;
};

/** The name input and the column hints under it. */
function AttributeNameFields({
  attribute,
  columnLabel,
  isPrimaryKey,
  isLabelColumn,
  editor,
}: Readonly<Omit<Props, "columnDataType">>): React.ReactNode {
  const { t } = useLingui();
  return (
    <>
      <TextInput
        size="xs"
        value={attribute.name}
        aria-label={t`Name for ${columnLabel}`}
        error={
          attribute.isIncluded &&
          ConceptStatus.isReservedAttributeName(attribute.name)
            ? t`Every case type already has a status. Choose another name.`
            : undefined
        }
        onChange={(event) => {
          editor.setAttributeName(
            attribute.columnId,
            event.currentTarget.value,
          );
        }}
      />
      <Group gap={4} mt={2}>
        <Text size="xs" c="dimmed" className={css.columnHint}>
          {columnLabel}
        </Text>
        {isPrimaryKey ? (
          <Text size="xs" c="blue.7">
            {t`join key`}
          </Text>
        ) : null}
        {isLabelColumn ? (
          <Text size="xs" c="blue.7">
            {t`label`}
          </Text>
        ) : null}
      </Group>
    </>
  );
}

/**
 * The switch between one value and every value, and for one value, the select
 * for which value to keep.
 */
function AttributeValueControls({
  attribute,
  isPrimaryKey,
  isLabelColumn,
  columnDataType,
  editor,
}: Readonly<Omit<Props, "columnLabel">>): React.ReactNode {
  return (
    <div className={css.valueControls}>
      <ValueShapeControl
        fieldName={attribute.name}
        value={attribute.valueShape}
        // A join key matches rows to a case and the label names it, so both
        // keep one value.
        disabled={isPrimaryKey || isLabelColumn}
        onChange={(valueShape) => {
          editor.setAttributeValueShape(attribute.columnId, valueShape);
        }}
      />
      {match(attribute.valueShape)
        .with("single", () => {
          return (
            <CaseTypeDraftValueRuleSelect
              className={css.ruleSelect}
              attribute={attribute}
              columnDataType={columnDataType}
              isPrimaryKey={isPrimaryKey}
              editor={editor}
            />
          );
        })
        .with("list", () => {
          return null;
        })
        .exhaustive()}
    </div>
  );
}

/**
 * One attribute in the draft card: whether to map it, what to call it, whether
 * it keeps one value or every value, and for one value, which to keep.
 */
export function CaseTypeDraftAttributeRow(
  props: Readonly<Props>,
): React.ReactNode {
  const { t } = useLingui();
  const { attribute, isPrimaryKey, editor } = props;
  return (
    <div
      className={clsx(css.attributeRow, {
        [css.attributeRowExcluded!]: !attribute.isIncluded,
      })}
    >
      <Checkbox
        className={css.includeCheckbox}
        checked={attribute.isIncluded}
        // A join key matches its dataset's rows to a case, so it stays mapped.
        disabled={isPrimaryKey}
        aria-label={t`Include ${attribute.name}`}
        onChange={() => {
          editor.toggleAttribute(attribute.columnId);
        }}
      />
      <div>
        <AttributeNameFields {...props} />
        <AttributeValueControls {...props} />
      </div>
    </div>
  );
}
