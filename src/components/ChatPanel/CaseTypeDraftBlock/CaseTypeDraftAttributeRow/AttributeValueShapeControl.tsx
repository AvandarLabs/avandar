import { useLingui } from "@lingui/react/macro";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl";
import type {
  ChatCaseValueShape,
  ChatProposedCaseAttribute,
} from "$/types/chat.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { CaseTypeDraftEditor } from "@/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor";
import type { ReactNode } from "react";

type Props = {
  attribute: ChatProposedCaseAttribute;
  /** Locks the switch to one value, for a join key or the label. */
  isLocked: boolean;
  /** The date and timestamp columns of the attribute's dataset. */
  dateColumnOptions: readonly DateColumnOption[];
  editor: CaseTypeDraftEditor;
};

/**
 * Sets a draft field's shape from the switch. A period keeps the field's
 * earlier choices, or starts per month on its dataset's first date column.
 */
function _setValueShape(
  options: Readonly<{
    attribute: ChatProposedCaseAttribute;
    valueShape: ChatCaseValueShape;
    dateColumnOptions: readonly DateColumnOption[];
    editor: CaseTypeDraftEditor;
  }>,
): void {
  const { attribute, valueShape, editor } = options;
  if (valueShape === "bucketed_list") {
    editor.setAttributeBucket(attribute.columnId, {
      bucketGrain: attribute.bucketGrain ?? "month",
      bucketColumnId:
        attribute.bucketColumnId ?? options.dateColumnOptions[0]?.value,
    });
    return;
  }
  editor.setAttributeValueShape(attribute.columnId, valueShape);
}

/**
 * A draft field's switch between one value, every value, and one value per
 * period, locked with a note for a join key or the label. Rendered by
 * `AttributeValueControls`.
 */
export function AttributeValueShapeControl({
  attribute,
  isLocked,
  dateColumnOptions,
  editor,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <ValueShapeControl
      fieldName={attribute.name}
      value={attribute.valueShape}
      disabled={isLocked}
      description={
        isLocked ? t`Join keys and the label keep one value.` : undefined
      }
      onChange={(valueShape) => {
        _setValueShape({ attribute, valueShape, dateColumnOptions, editor });
      }}
    />
  );
}
