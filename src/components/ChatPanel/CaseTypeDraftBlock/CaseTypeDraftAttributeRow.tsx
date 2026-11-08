import { useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Text, TextInput } from "@mantine/core";
import clsx from "clsx";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
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

/**
 * One attribute in the draft card: whether to map it, what to call it, and
 * which value to keep when its dataset holds several rows per case.
 */
export function CaseTypeDraftAttributeRow({
  attribute,
  columnLabel,
  isPrimaryKey,
  isLabelColumn,
  columnDataType,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <div
      className={clsx(css.attributeRow, {
        [css.attributeRowExcluded!]: !attribute.isIncluded,
      })}
    >
      <Checkbox
        checked={attribute.isIncluded}
        // A join key matches its dataset's rows to a case, so it stays mapped.
        disabled={isPrimaryKey}
        aria-label={t`Include ${attribute.name}`}
        onChange={() => {
          editor.toggleAttribute(attribute.columnId);
        }}
      />
      <div>
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
      </div>
      <CaseTypeDraftValueRuleSelect
        attribute={attribute}
        columnDataType={columnDataType}
        isPrimaryKey={isPrimaryKey}
        editor={editor}
      />
    </div>
  );
}
