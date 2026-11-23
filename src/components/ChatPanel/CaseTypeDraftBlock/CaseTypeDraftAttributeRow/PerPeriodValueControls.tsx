import { PeriodControls } from "@/components/caseFields/PeriodControls/PeriodControls";
import type { ChatProposedCaseAttribute } from "$/types/chat.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { CaseTypeDraftEditor } from "@/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor";
import type { ReactNode } from "react";

type Props = {
  attribute: ChatProposedCaseAttribute;
  /** The date and timestamp columns of the attribute's dataset. */
  dateColumnOptions: readonly DateColumnOption[];
  /** The select for which value to keep in each period. */
  ruleSelect: ReactNode;
  editor: CaseTypeDraftEditor;
};

/**
 * A per-period draft field's period, date column, and which value to keep
 * in each period. Rendered by `AttributeValueControls` once the field keeps
 * one value per period.
 */
export function PerPeriodValueControls({
  attribute,
  dateColumnOptions,
  ruleSelect,
  editor,
}: Readonly<Props>): ReactNode {
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
}
