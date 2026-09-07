import { Trans, useLingui } from "@lingui/react/macro";
import { Anchor, Group, Stack, Text } from "@mantine/core";
import clsx from "clsx";
import css from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetColumnOutline/DatasetColumnOutline.module.css";
import { buildShortDataTypeLabel } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/datasetSummaryLabels";
import { makeColumnSectionIdFromColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/makeColumnSectionIdFromColumnName";
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
        <Text className={css.datasetColumnOutlineSummaryLine}>
          <Trans>
            {columns.length} columns · {numRows.toLocaleString(i18n.locale)}{" "}
            rows
          </Trans>
        </Text>
        {columns.map((column) => {
          const isActive = activeColumnName === column.name;
          const sectionId = makeColumnSectionIdFromColumnName(column.name);
          return (
            <Anchor
              key={column.name}
              href={`#${sectionId}`}
              className={clsx(
                css.datasetColumnOutlineLink,
                isActive && css.datasetColumnOutlineLinkActive,
              )}
              aria-current={isActive ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                document
                  .getElementById(sectionId)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Group gap="xs" wrap="nowrap" align="baseline">
                <Text
                  size="xs"
                  className={css.datasetColumnOutlineLinkName}
                  truncate
                >
                  {column.name}
                </Text>
                <Text size="xs" className={css.datasetColumnOutlineLinkType}>
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
