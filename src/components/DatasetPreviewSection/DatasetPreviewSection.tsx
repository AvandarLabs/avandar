import { Trans, useLingui } from "@lingui/react/macro";
import { Skeleton, Stack, Text } from "@mantine/core";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { ReactNode } from "react";

/** The grid's height when the host does not set one. */
const DEFAULT_GRID_HEIGHT = 500;

type Props = {
  /** Every column to show, in order. */
  columnNames: readonly string[];

  /** The preview's rows, or undefined while they load or when they failed. */
  rows: readonly UnknownRow[] | undefined;

  /**
   * The most rows the preview reads. A preview that holds this many says it
   * shows only the first rows, so nobody mistakes it for the whole dataset.
   */
  maxPreviewRows: number;

  /**
   * Columns whose values are epoch milliseconds to format as dates. Without
   * them a date column reads as "1,579,651,200,000".
   */
  dateColumnNames?: ReadonlySet<string>;

  isLoading: boolean;

  /** True when the rows could not be read. */
  isError?: boolean;

  /** The grid's height. */
  gridHeight?: number | string;
};

/**
 * The "Data preview" section: the first rows of a dataset in a grid, headed
 * by how many rows it shows.
 *
 * A preview that reached its row cap says so in a line under the heading,
 * because a full-looking grid otherwise reads as the whole dataset.
 */
export function DatasetPreviewSection({
  columnNames,
  rows,
  maxPreviewRows,
  dateColumnNames,
  isLoading,
  isError = false,
  gridHeight = DEFAULT_GRID_HEIGHT,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const numRows = rows?.length ?? 0;
  const isCapped = rows !== undefined && numRows >= maxPreviewRows;

  return (
    <AppViewSection
      title={<Trans>Data preview</Trans>}
      meta={rows === undefined ? undefined : t`First ${numRows} rows`}
    >
      {isLoading ? (
        <Skeleton height={gridHeight} radius="sm" />
      ) : isError ? (
        <Text size="sm" c="dimmed">
          <Trans>We couldn't load a preview of this dataset.</Trans>
        </Text>
      ) : rows ? (
        <Stack gap="xs">
          {isCapped ? (
            <Text size="sm" c="dimmed">
              <Trans>
                This preview shows only the first {numRows} rows of the dataset.
              </Trans>
            </Text>
          ) : null}
          <DataGrid
            columnNames={columnNames}
            data={[...rows]}
            dateColumns={dateColumnNames}
            dateFormat="YYYY-MM-DD"
            height={gridHeight}
          />
        </Stack>
      ) : null}
    </AppViewSection>
  );
}
