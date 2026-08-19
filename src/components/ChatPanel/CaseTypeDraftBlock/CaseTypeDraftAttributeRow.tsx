import { useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Select, Text, TextInput } from "@mantine/core";
import clsx from "clsx";
import css from "./CaseTypeDraftCard.module.css";
import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";
import type {
  ChatCaseValuePickerRuleType,
  ChatProposedCaseAttribute,
} from "$/types/chat.types";

type Props = {
  attribute: ChatProposedCaseAttribute;
  columnLabel: string;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  valuePickerOptions: ReadonlyArray<{ value: string; label: string }>;
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
  valuePickerOptions,
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
          {isPrimaryKey ?
            <Text size="xs" c="blue.7">
              {t`join key`}
            </Text>
          : null}
          {isLabelColumn ?
            <Text size="xs" c="blue.7">
              {t`label`}
            </Text>
          : null}
        </Group>
      </div>
      <Select
        size="xs"
        data={valuePickerOptions}
        value={attribute.valuePickerRuleType}
        allowDeselect={false}
        aria-label={t`Value to keep for ${attribute.name}`}
        onChange={(value) => {
          if (value) {
            editor.setAttributeValuePicker(
              attribute.columnId,
              value as ChatCaseValuePickerRuleType,
            );
          }
        }}
      />
    </div>
  );
}
