import { useLingui } from "@lingui/react/macro";
import { Checkbox } from "@mantine/core";
import clsx from "clsx";
import css from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css";
import { AttributeNameFields } from "./AttributeNameFields";
import { AttributeValueControls } from "./AttributeValueControls";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ChatProposedCaseAttribute } from "$/types/chat.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { CaseTypeDraftEditor } from "@/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor";

type Props = {
  attribute: ChatProposedCaseAttribute;
  columnLabel: string;
  /** The column's type, once the catalog has loaded. */
  columnDataType: AvaDataType.T | undefined;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  /** The date and timestamp columns of the attribute's dataset. */
  dateColumnOptions: readonly DateColumnOption[];
  editor: CaseTypeDraftEditor;
};

/**
 * One attribute in the draft card: whether to map it, what to call it, whether
 * it keeps one value, every value, or one value per period, and for one value
 * or a period, which value to keep.
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
        <AttributeNameFields
          attribute={attribute}
          columnLabel={props.columnLabel}
          isPrimaryKey={isPrimaryKey}
          isLabelColumn={props.isLabelColumn}
          editor={editor}
        />
        <AttributeValueControls
          attribute={attribute}
          columnDataType={props.columnDataType}
          isPrimaryKey={isPrimaryKey}
          isLabelColumn={props.isLabelColumn}
          dateColumnOptions={props.dateColumnOptions}
          editor={editor}
        />
      </div>
    </div>
  );
}
