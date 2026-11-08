import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { PeriodControls } from "@/components/caseFields/PeriodControls/PeriodControls";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl";
import css from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css";
import { CaseTypeDraftValueRuleSelect } from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftValueRuleSelect";
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
export function AttributeValueControls({
  attribute,
  isPrimaryKey,
  isLabelColumn,
  columnDataType,
  dateColumnOptions,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  // A join key matches rows to a case and the label names it, so both keep
  // one value.
  const isLocked = isPrimaryKey || isLabelColumn;
  const ruleSelect = (
    <CaseTypeDraftValueRuleSelect
      className={css.ruleSelect}
      attribute={attribute}
      columnDataType={columnDataType}
      isPrimaryKey={isPrimaryKey}
      editor={editor}
    />
  );
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
          if (valueShape === "bucketed_list") {
            editor.setAttributeBucket(attribute.columnId, {
              bucketGrain: attribute.bucketGrain ?? "month",
              bucketColumnId:
                attribute.bucketColumnId ?? dateColumnOptions[0]?.value,
            });
            return;
          }
          editor.setAttributeValueShape(attribute.columnId, valueShape);
        }}
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
            <>
              <PeriodControls
                size="xs"
                fieldName={attribute.name}
                bucketGrain={attribute.bucketGrain ?? "month"}
                bucketColumnId={attribute.bucketColumnId}
                dateColumnOptions={dateColumnOptions}
                onChange={(choice) => {
                  editor.setAttributeBucket(attribute.columnId, choice);
                }}
              />
              {ruleSelect}
            </>
          );
        })
        .exhaustive()}
    </div>
  );
}
