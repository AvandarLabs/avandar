import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl";
import css from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css";
import { CaseTypeDraftValueRuleSelect } from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftValueRuleSelect";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ChatProposedCaseAttribute } from "$/types/chat.types";
import type { CaseTypeDraftEditor } from "@/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor";

type Props = {
  attribute: ChatProposedCaseAttribute;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  editor: CaseTypeDraftEditor;
};

/**
 * The switch between one value and every value, and for one value, the select
 * for which value to keep.
 */
export function AttributeValueControls({
  attribute,
  isPrimaryKey,
  isLabelColumn,
  columnDataType,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  // A join key matches rows to a case and the label names it, so both keep
  // one value.
  const isLocked = isPrimaryKey || isLabelColumn;
  return (
    <div className={css.valueControls}>
      <ValueShapeControl
        fieldName={attribute.name}
        value={attribute.valueShape}
        disabled={isLocked}
        description={
          isLocked ? t`Join keys and the label keep one value.` : undefined
        }
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
