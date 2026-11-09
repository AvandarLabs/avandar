import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import { useValuePickerOptions } from "./useValuePickerOptions";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  ChatCaseValuePickerRuleType,
  ChatProposedCaseAttribute,
} from "$/types/chat.types";
import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

type Props = {
  /** Classes for the select's root, for its width in the row. */
  className?: string;
  attribute: ChatProposedCaseAttribute;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  /**
   * Whether the field is its dataset's join key. Creation saves the default
   * rule for every join key, so the select shows that rule, locked.
   */
  isPrimaryKey: boolean;
  editor: CaseTypeDraftEditor;
};

/**
 * The select for which value to keep when a dataset holds several rows per
 * case, offering only the rules the column's type allows.
 *
 * A join key never reduces its rows: it shows the default rule, locked, with
 * a note saying why. A proposed rule the column's type refuses is saved as
 * the default rule, so the select shows that one rather than a value missing
 * from its options. The draft itself keeps the proposed rule until the user
 * picks another, and creation replaces a join key's or a disallowed rule
 * anyway.
 */
export function CaseTypeDraftValueRuleSelect({
  className,
  attribute,
  columnDataType,
  isPrimaryKey,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const valuePickerOptions = useValuePickerOptions(columnDataType);
  const allowedRuleType = columnDataType
    ? ValuePickerRule.toAllowedRuleType({
        ruleType: attribute.valuePickerRuleType,
        columnDataType,
      })
    : attribute.valuePickerRuleType;

  return (
    <Select
      className={className}
      size="xs"
      data={valuePickerOptions}
      value={isPrimaryKey ? ValuePickerRule.DEFAULT_RULE_TYPE : allowedRuleType}
      disabled={isPrimaryKey}
      description={
        isPrimaryKey ? t`ID fields keep their value as is.` : undefined
      }
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
  );
}
