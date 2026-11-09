import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The id of the table the toggle opens and folds. */
  tableId: string;
  isExpanded: boolean;
  /** The label that offers every period, such as "Show all 8 months". */
  showAllLabel: string;
  onToggle: () => void;
};

/** The button under a long period table that opens or folds older periods. */
export function PeriodTableToggle({
  tableId,
  isExpanded,
  showAllLabel,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Button
      className={css.toggle}
      variant="subtle"
      color="neutral"
      size="compact-xs"
      aria-expanded={isExpanded}
      aria-controls={tableId}
      onClick={onToggle}
    >
      {isExpanded ? t`Show fewer` : showAllLabel}
    </Button>
  );
}
