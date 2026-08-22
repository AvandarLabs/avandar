import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { ColumnNameHint } from "./ColumnNameHint";
import { RowValueList } from "./RowValueList";

type Props = {
  /** Total count being sent (sampleValues may be a subset). */
  totalCount?: number;
  /** Sample of the values that will leave the browser. */
  sampleValues?: readonly unknown[];
  /** Source column name, if relevant. */
  columnName?: string;
  /** Capped preview slice of the values to show. */
  previewValues: readonly unknown[];
};

/**
 * Renders the `clean` mode: a simple "Send N values?" confirmation with no
 * warnings.
 */
export function CleanPanel({
  totalCount,
  sampleValues,
  columnName,
  previewValues,
}: Props): React.ReactNode {
  return (
    <>
      <Text size="sm">
        <Trans>
          Send <strong>{totalCount ?? sampleValues?.length ?? 0}</strong> value
          {(totalCount ?? sampleValues?.length ?? 0) === 1 ? "" : "s"} to the
          AI?
        </Trans>
      </Text>
      <ColumnNameHint columnName={columnName} />
      <RowValueList values={previewValues} />
    </>
  );
}
