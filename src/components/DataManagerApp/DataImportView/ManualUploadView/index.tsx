import { Box, BoxProps, Stack } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetEntryClient } from "@/clients/datasets/LocalDatasetEntryClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { DuckDBDataType } from "@/clients/DuckDBClient/DuckDBDataType";
import { getRandomTableName } from "@/clients/DuckDBClient/getRandomTableName";
import { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/types";
import { AppConfig } from "@/config/AppConfig";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { MIMEType, UnknownObject } from "@/lib/types/common";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/notifications/notify";
import { FileUploadField } from "@/lib/ui/singleton-forms/FileUploadField";
import { snakeCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { Dataset } from "@/models/datasets/Dataset";
import { WorkspaceId } from "@/models/Workspace/types";
import { DetectedDatasetColumn } from "../../hooks/detectColumnDataTypes";
import {
  DatasetUploadForm,
  DatasetUploadFormValues,
} from "../DatasetUploadForm";

async function saveLocalCSVToBackend(params: {
  name: string;
  description: string;
  columns: DetectedDatasetColumn[];
  workspaceId: WorkspaceId;
  loadCSVResult: DuckDBLoadCSVResult;
  sizeInBytes: number;
  rowsToSkip?: number;
  delimiter?: string;
}): Promise<Dataset> {
  const {
    name,
    description,
    sizeInBytes,
    workspaceId,
    columns,
    delimiter,
    rowsToSkip,
    loadCSVResult,
  } = params;
  const { csvSniff, tableName } = loadCSVResult;
  const dataset = await DatasetClient.insertCSVFileDataset({
    workspaceId,
    datasetName: name,
    datasetDescription: description,
    columns: columns.map(snakeCaseKeysShallow),
    sizeInBytes,
    parseOptions: {
      // use the user-defined parse options here first. Otherwise, default to
      // the sniffed options.
      rowsToSkip: rowsToSkip ?? csvSniff.SkipRows,
      delimiter: delimiter ?? csvSniff.Delimiter,

      // Fill in the other options from the CSV sniff object
      quoteChar: csvSniff.Quote,
      escapeChar: csvSniff.Escape,
      newlineDelimiter: csvSniff.NewLineDelimiter,
      commentChar: csvSniff.Comment,
      hasHeader: csvSniff.HasHeader,
      dateFormat: csvSniff.DateFormat,
      timestampFormat: csvSniff.TimestampFormat,
    },
  });

  // now that we've persisted the dataset to the backend, let's add an entry
  // to IndexedDB to map the datasetId to the table name, so we can always
  // remember where a dataset's locally loaded raw data is stored.
  await LocalDatasetEntryClient.insert({
    data: {
      datasetId: dataset.id,
      localTableName: tableName,
    },
  });
  return dataset;
}

type Props = BoxProps;

export function ManualUploadView({ ...props }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const workspace = useCurrentWorkspace();

  const [parseOptions, setParseOptions] = useState<{
    file: File;
    localTableName: string;
    numRowsToSkip?: number;
    delimiter?: string;
  }>();

  // query to load the data locally to DuckDB
  const [loadResults, isLoadingCSV, loadQueryObj] = useQuery({
    queryKey: ["load-csv", parseOptions],
    queryFn: async (): Promise<
      | {
          metadata: DuckDBLoadCSVResult;
          previewRows: UnknownObject[];
        }
      | undefined
    > => {
      if (!parseOptions) {
        return undefined;
      }
      const { file, localTableName, numRowsToSkip, delimiter } = parseOptions;
      const loadResult = await DuckDBClient.loadCSV({
        file,
        numRowsToSkip,
        delimiter,
        tableName: localTableName,
      });
      // now query the file for the rows to preview
      const previewData = await DuckDBClient.runRawQuery(
        `SELECT * FROM "$tableName$" LIMIT $maxPreviewRows$`,
        {
          tableName: localTableName,
          maxPreviewRows: AppConfig.dataManagerApp.maxPreviewRows,
        },
      );
      return { metadata: loadResult, previewRows: previewData.data };
    },
    enabled: !!parseOptions,
    // this ensures that we dont immediately set `loadResults` to undefined when
    // the `parseOptions` change.
    placeholderData: (prevValue) => {
      return prevValue;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // check if dataset has loaded and if so, show a notification
  useEffect(() => {
    if (loadResults) {
      const {
        metadata: { numRows: numSuccessRows, numRejectedRows },
      } = loadResults;
      if (numRejectedRows === 0) {
        notifySuccess({
          title: "File loaded successfully",
          message: `Parsed ${numSuccessRows} rows`,
        });
      } else if (numSuccessRows === 0) {
        notifyError({
          title: "File failed to load",
          message: "No rows were read successfully",
        });
      } else {
        notifyWarning({
          title: "File was partially loaded",
          message: `Parsed ${numSuccessRows} rows successfully, but ${
            numRejectedRows > 1000 ?
              " over 1000 rows were rejected"
            : ` ${numRejectedRows} rows were rejected`
          }`,
        });
      }
    }
  }, [loadResults]);

  const detectedColumns = useMemo(() => {
    return loadResults?.metadata.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        dataType: DuckDBDataType.toDatasetDataType(duckColumn.column_type),
        columnIdx: idx,
      };
    });
  }, [loadResults]);

  const onFileSubmit = (file: File | undefined) => {
    if (file) {
      setParseOptions({
        file,
        localTableName: getRandomTableName(),
      });
    } else {
      notifyError({
        title: "No file selected",
        message: "Please select a file to import",
      });
    }
  };

  return (
    <Box {...props}>
      <Stack align="flex-start">
        <FileUploadField
          label="Upload a CSV"
          description="Select a CSV from your computer to import"
          placeholder="Select file"
          accept={MIMEType.TEXT_CSV}
          fullWidth
          isSubmitting={isLoadingCSV}
          onSubmit={onFileSubmit}
        />

        {detectedColumns && parseOptions && loadResults ?
          <DatasetUploadForm
            key={loadResults.metadata.id}
            defaultName={parseOptions.file.name}
            rows={loadResults.previewRows}
            columns={detectedColumns}
            doDatasetSave={async (
              datasetFormValues: DatasetUploadFormValues,
            ) => {
              const dataset = await saveLocalCSVToBackend({
                workspaceId: workspace.id,
                name: datasetFormValues.name,
                description: datasetFormValues.description,
                sizeInBytes: parseOptions.file.size,
                rowsToSkip: parseOptions.numRowsToSkip,
                columns: detectedColumns,
                loadCSVResult: loadResults.metadata,
              });
              queryClient.invalidateQueries({
                queryKey: DatasetClient.QueryKeys.getAll(),
              });
              return dataset;
            }}
            loadCSVResult={loadResults.metadata}
            onRequestDataParse={async (parseConfig: {
              numRowsToSkip: number;
              delimiter: string;
            }) => {
              // drop the dataset so we can re-parse it from scratch
              await DuckDBClient.dropDataset(loadResults.metadata.tableName);
              setParseOptions((prevParseOptions) => {
                if (prevParseOptions) {
                  return {
                    file: prevParseOptions.file,
                    numRowsToSkip: parseConfig.numRowsToSkip,
                    delimiter: parseConfig.delimiter,

                    // generate a new local table name for this new parsing
                    localTableName: getRandomTableName(),
                  };
                }
                return prevParseOptions;
              });
            }}
            isProcessing={loadQueryObj.isFetching}
          />
        : null}

        <Dropzone.FullScreen
          onDrop={(files: FileWithPath[]) => {
            const uploadedFile = files[0];
            if (uploadedFile) {
              setParseOptions({
                file: uploadedFile,
                localTableName: getRandomTableName(),
              });
            }
          }}
        >
          <Dropzone.Accept>
            <IconUpload
              size={52}
              color="var(--mantine-color-blue-6)"
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              size={52}
              color="var(--mantine-color-dimmed)"
              stroke={1.5}
            />
          </Dropzone.Idle>
        </Dropzone.FullScreen>
      </Stack>
    </Box>
  );
}
