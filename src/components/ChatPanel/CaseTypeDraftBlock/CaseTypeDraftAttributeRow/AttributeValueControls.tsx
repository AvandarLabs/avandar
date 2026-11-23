import { match } from "ts-pattern";
import css from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css";
import { CaseTypeDraftValueRuleSelect } from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftValueRuleSelect";
import { AttributeValueShapeControl } from "./AttributeValueShapeControl";
import { PerPeriodValueControls } from "./PerPeriodValueControls";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ChatProposedCaseAttribute } from "$/types/chat.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { CaseTypeDraftEditor } from "@/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor";

type Props = {
  attribute: ChatProposedCaseAttribute;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  /** The date and timestamp columns of the attribute's dataset. */
  dateColumnOptions: readonly DateColumnOption[];
  editor: CaseTypeDraftEditor;
};

/**
 * The switch between one value, every value, and one value per period; for a
 * period, its period and date column; and for one value or a period, the
 * select for which value to keep.
 */
export function AttributeValueControls(
  props: Readonly<Props>,
): React.ReactNode {
  const { attribute, dateColumnOptions, editor } = props;
  const ruleSelect = (
    <CaseTypeDraftValueRuleSelect
      className={css.ruleSelect}
      attribute={attribute}
      columnDataType={props.columnDataType}
      isPrimaryKey={props.isPrimaryKey}
      editor={editor}
    />
  );
  return (
    <div className={css.valueControls}>
      <AttributeValueShapeControl
        attribute={attribute}
        // A join key matches rows to a case and the label names it, so both
        // keep one value.
        isLocked={props.isPrimaryKey || props.isLabelColumn}
        dateColumnOptions={dateColumnOptions}
        editor={editor}
      />
      {match(attribute.valueShape)
        .with("single", () => {
          return ruleSelect;
        })
        .with("list", () => {
          return null;
        })
        .with("bucketed_list", () => {
          return (
            <PerPeriodValueControls
              attribute={attribute}
              dateColumnOptions={dateColumnOptions}
              ruleSelect={ruleSelect}
              editor={editor}
            />
          );
        })
        .exhaustive()}
    </div>
  );
}
