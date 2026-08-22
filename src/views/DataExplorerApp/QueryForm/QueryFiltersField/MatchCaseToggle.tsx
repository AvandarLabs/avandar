import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLetterCase } from "@tabler/icons-react";

import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";

type Props = {
  operator: QueryFilterOperator;
  dataType: AvaDataTypeNs.T | undefined;
  matchCase: boolean;
  onChange: (matchCase: boolean) => void;
};

/**
 * Toggles case-sensitive matching for one rule. Text comparison is
 * case-insensitive by default, so this is the opt-in for the stricter reading.
 * Hidden when the operator or column type does not care about case.
 */
export function MatchCaseToggle({
  operator,
  dataType,
  matchCase,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const spec = QueryFilterOperator.getSpec(operator);
  const isTextColumn = dataType === undefined || AvaDataType.isText(dataType);
  if (!spec?.supportsMatchCase || !isTextColumn) {
    return null;
  }
  return (
    <Tooltip label={t`Match case`} withinPortal>
      <ActionIcon
        variant={matchCase ? "filled" : "subtle"}
        color={matchCase ? "blue" : "gray"}
        size="md"
        aria-label={t`Match case`}
        aria-pressed={matchCase}
        onClick={() => {
          onChange(!matchCase);
        }}
      >
        <IconLetterCase size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
