import { useLingui } from "@lingui/react/macro";
import { Group, NumberInput } from "@mantine/core";
import { getManualQueryLimitValue } from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import css from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/LimitFields/LimitFields.module.css";
import { ManualQueryLargeDatasetLimitHint } from "@/views/DataExplorerApp/QueryForm/ManualQueryLargeDatasetLimitHint/ManualQueryLargeDatasetLimitHint";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { ReactNode } from "react";

type Props = {
  query: StructuredQuery.Partial;
  onSetLimit: ManualQueryFormHandlers["onSetLimit"];
  isLargeDatasetLimitHintVisible: boolean;
  dismissLargeDatasetLimitHint: () => void;
};

/** Row limit input plus the hint shown when a large dataset caps it. */
export function LimitFields({
  query,
  onSetLimit,
  isLargeDatasetLimitHintVisible,
  dismissLargeDatasetLimitHint,
}: Props): ReactNode {
  const { t } = useLingui();
  const limit = getManualQueryLimitValue(query);
  return (
    <Group align="flex-end" wrap="nowrap" gap="sm">
      <NumberInput
        label={t`Limit`}
        placeholder={t`Maximum rows to return`}
        min={1}
        step={1}
        className={css.limitInput}
        value={typeof limit === "number" ? limit : ""}
        onChange={(nextLimit) => {
          dismissLargeDatasetLimitHint();
          onSetLimit(typeof nextLimit === "number" ? nextLimit : undefined);
        }}
      />
      <ManualQueryLargeDatasetLimitHint
        visible={isLargeDatasetLimitHintVisible}
      />
    </Group>
  );
}
