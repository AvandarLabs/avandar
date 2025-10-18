import { ScrollArea, Stack, StackProps } from "@mantine/core";
import { Callout } from "@/lib/ui/Callout";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import {
  DatasetColumnRead,
  DetectedDatasetColumn,
} from "@/models/datasets/DatasetColumn";

type Props = {
  /** The preview rows to display in the data grid */
  previewRows: Array<Record<string, unknown>>;

  /** The column information to display in the details section */
  columns: readonly DetectedDatasetColumn[];

  /**
   * Optional component to render in the data preview callout
   * This is where you can put controls for reparsing the data
   */
  dataPreviewCalloutContents?: React.ReactNode;

  /** Optional message to display in the data preview callout */
  dataPreviewCalloutMessage?: string;

  /** Optional message to display in the dataset columns callout */
  dataColumnsCalloutMessage?: string;
} & StackProps;

export function DatasetPreviewBlock({
  previewRows,
  columns,
  dataPreviewCalloutMessage,
  dataPreviewCalloutContents,
  dataColumnsCalloutMessage,
  ...stackProps
}: Props): JSX.Element {
  const dataPreviewMsg =
    dataPreviewCalloutMessage ??
    `These are the first ${previewRows.length} rows of your dataset.`;
  const dataColumnsMsg =
    dataColumnsCalloutMessage ??
    `${columns.length} columns were detected. Review the column info below to make sure they are correct.`;

  const columnNames = columns.map(getProp("name"));

  return (
    <Stack gap="md" {...stackProps}>
      <Callout title="Data Preview" color="info" message={dataPreviewMsg}>
        {dataPreviewCalloutContents}
      </Callout>
      <DataGrid columnNames={columnNames} data={previewRows} />
      <Callout title="Column info" color="info" message={dataColumnsMsg} />
      <ScrollArea h={500} type="auto">
        <ObjectDescriptionList
          data={columns}
          renderAsTable
          renderTableHeader={(key: keyof DatasetColumnRead) => {
            return key === "name" ? "Column Name" : undefined;
          }}
          itemRenderOptions={{
            includeKeys: ["name", "dataType"],
          }}
        />
      </ScrollArea>
    </Stack>
  );
}
