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
  attribute: ChatProposedCaseAttribute;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  editor: CaseTypeDraftEditor;
};

/**
 * The select for which value to keep when a dataset holds several rows per
 * case, offering only the rules the column's type allows.
 *
 * A proposed rule the column's type refuses is saved as the default rule, so
 * the select shows that one rather than a value missing from its options. The
 * draft itself keeps the proposed rule until the user picks another, and
 * creation replaces a disallowed rule anyway.
 */
export function CaseTypeDraftValueRuleSelect({
  attribute,
  columnDataType,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const valuePickerOptions = useValuePickerOptions(columnDataType);
  const shownRuleType = columnDataType
    ? ValuePickerRule.toAllowedRuleType({
        ruleType: attribute.valuePickerRuleType,
        columnDataType,
      })
    : attribute.valuePickerRuleType;

  return (
    <Select
      size="xs"
      data={valuePickerOptions}
      value={shownRuleType}
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
