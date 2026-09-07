import { Trans, useLingui } from "@lingui/react/macro";
import { Anchor, Group, Stack, Text } from "@mantine/core";
import clsx from "clsx";
import { buildColumnSectionId } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/buildColumnSectionId";
import css from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetColumnOutline/DatasetColumnOutline.module.css";
import { buildShortDataTypeLabel } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/datasetSummaryLabels";
import type { ReactNode } from "react";

type OutlineColumn = {
  name: string;
  dataType: string;
};

type Props = {
  columns: readonly OutlineColumn[];
  numRows: number;

  /** The column whose section is currently at the top of the reading area. */
  activeColumnName: string | undefined;
};

/**
 * The table of contents for a dataset summary: every column, its type, and
 * which one you are reading.
 *
 * It lives in the view's rail rather than to the left of the content. Put on
 * the leading edge it made three columns of links in a row, and the eye had
 * to cross two of them to reach the thing it came for.
 */
export function DatasetColumnOutline({
  columns,
  numRows,
  activeColumnName,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();

  return (
    <nav aria-label={t`Column outline`}>
      <Stack gap={2}>
        <Text className={css.summaryLine}>
          <Trans>
            {columns.length} columns · {numRows.toLocaleString(i18n.locale)}{" "}
            rows
          </Trans>
        </Text>
        {columns.map((column) => {
          const isActive = activeColumnName === column.name;
          return (
            <Anchor
              key={column.name}
              href={`#${buildColumnSectionId(column.name)}`}
              className={clsx(css.link, isActive && css.linkActive)}
              aria-current={isActive ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                document
                  .getElementById(buildColumnSectionId(column.name))
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Group gap="xs" wrap="nowrap" align="baseline">
                <Text size="xs" className={css.linkName} truncate>
                  {column.name}
                </Text>
                <Text size="xs" className={css.linkType}>
                  {buildShortDataTypeLabel(column.dataType, i18n)}
                </Text>
              </Group>
            </Anchor>
          );
        })}
      </Stack>
    </nav>
  );
}
