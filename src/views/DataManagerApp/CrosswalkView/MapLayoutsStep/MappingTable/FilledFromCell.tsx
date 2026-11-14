import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import type { FillSummary } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/useFillSummary";
import type { ReactNode } from "react";

type Props = {
  /** The fill described, or undefined when the column has none yet. */
  summary: FillSummary | undefined;
};

/**
 * What fills a column for this layout: a main line (the source column,
 * the fixed value, the expression, or Leave empty) and a dimmed detail
 * under it, or "Not filled yet".
 */
export function FilledFromCell({ summary }: Readonly<Props>): ReactNode {
  if (!summary) {
    return (
      <Text size="sm" c="dimmed">
        <Trans>Not filled yet</Trans>
      </Text>
    );
  }
  return (
    <>
      <Text
        size="sm"
        fw={summary.isEmpty ? 400 : 500}
        c={summary.isEmpty ? "dimmed" : undefined}
        truncate
      >
        {summary.main}
      </Text>
      {summary.detail ? (
        <Text size="xs" c="dimmed" truncate>
          {summary.detail}
        </Text>
      ) : null}
    </>
  );
}
