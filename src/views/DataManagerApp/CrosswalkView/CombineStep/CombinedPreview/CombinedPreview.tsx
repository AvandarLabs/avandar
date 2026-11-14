import { Callout } from "@avandar/ui";
import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader, Stack, Table, Text } from "@mantine/core";
import { useId } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import css from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombinedPreview/CombinedPreview.module.css";
import { CombiningProgress } from "@/views/DataManagerApp/CrosswalkView/CombineStep/CombiningProgress/CombiningProgress";
import type {
  CombinedPreviewRead,
  CombinedPreviewRow,
} from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombinedPreview/useCombinedPreview";
import type { CombiningProgressCount } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";
import type { ReactNode } from "react";

type Props = {
  preview: CombinedPreviewRead;
  columnNames: readonly string[];
  /** How many datasets the combined dataset stacks. */
  datasetCount: number;
};

function PreviewRow(
  props: Readonly<{
    row: CombinedPreviewRow;
    columnNames: readonly string[];
  }>,
): ReactNode {
  const { t } = useLingui();
  return (
    <Table.Tr>
      {props.columnNames.map((name) => {
        const value = props.row[name];
        return (
          <Table.Td key={name} className={css.combinedPreviewCell}>
            {value === undefined ? (
              <span className={css.combinedPreviewEmpty}>{t`empty`}</span>
            ) : (
              value
            )}
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}

function PreviewTable(
  props: Readonly<{
    rows: readonly CombinedPreviewRow[];
    columnNames: readonly string[];
    labelId: string;
  }>,
): ReactNode {
  return (
    <div
      className={css.combinedPreviewScroller}
      role="region"
      aria-labelledby={props.labelId}
      // The scroller must be reachable by keyboard to scroll sideways.
      tabIndex={0}
    >
      <Table
        fz="xs"
        verticalSpacing={4}
        horizontalSpacing="sm"
        aria-labelledby={props.labelId}
      >
        <Table.Thead>
          <Table.Tr>
            {props.columnNames.map((name) => {
              return <Table.Th key={name}>{name}</Table.Th>;
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {props.rows.map((row, rowIndex) => {
            // The rows have no identity of their own. Their order is fixed.
            return (
              <PreviewRow
                key={rowIndex}
                row={row}
                columnNames={props.columnNames}
              />
            );
          })}
        </Table.Tbody>
      </Table>
    </div>
  );
}

function ReadingPreview({
  datasetCount,
  progress,
}: Readonly<{
  datasetCount: number;
  progress: CombiningProgressCount;
}>): ReactNode {
  const message = plural(datasetCount, {
    one: "Reading # dataset on this device. The first time can take a few minutes.",
    other:
      "Reading # datasets on this device. The first time can take a few minutes.",
  });
  return (
    <Center py="lg" role="status">
      <Stack align="center" gap="sm" w="100%">
        <Loader size="sm" />
        <CombiningProgress
          readCount={progress.readCount}
          totalCount={progress.totalCount}
        />
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Center>
  );
}

/** "40 rows from 3 datasets", once the rows are counted. */
function usePreviewMeta(props: Readonly<Props>): string | undefined {
  const { t } = useLingui();
  if (props.preview.status !== "ready") {
    return undefined;
  }
  const rowsText = plural(props.preview.result.rowCount, {
    one: "# row",
    other: "# rows",
  });
  const datasetsText = plural(props.datasetCount, {
    one: "# dataset",
    other: "# datasets",
  });
  return t`${rowsText} from ${datasetsText}`;
}

/**
 * The stacked rows as the combined dataset will hold them: the row count
 * and the first 20 rows. Reading says that the first combine loads every
 * dataset onto this device and can take minutes.
 */
export function CombinedPreview(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  const { preview } = props;
  return (
    <AppViewSection
      title={
        <span id={labelId}>
          <Trans>Preview</Trans>
        </span>
      }
      meta={usePreviewMeta(props)}
    >
      {preview.status === "reading" ? (
        <ReadingPreview
          datasetCount={props.datasetCount}
          progress={preview.progress}
        />
      ) : null}
      {preview.status === "failed" ? (
        <Callout
          titleOrder={3}
          titleSize="sm"
          messageSize="sm"
          title={t`The preview could not be read`}
          message={t`Avandar could not combine these datasets on this device. Check the mappings and try again.`}
        />
      ) : null}
      {preview.status === "ready" ? (
        <PreviewTable
          rows={preview.result.rows}
          columnNames={props.columnNames}
          labelId={labelId}
        />
      ) : null}
    </AppViewSection>
  );
}
