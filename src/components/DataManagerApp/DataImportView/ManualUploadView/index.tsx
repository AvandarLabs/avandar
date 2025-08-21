import { Box, BoxProps, Stack } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { invariant } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { duckDataTypeToDatasetDataType } from "@/clients/DuckDBClient/duckDataTypeToDatasetDataType";
import { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/types";
import { AppConfig } from "@/config/AppConfig";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { MIMEType, UnknownObject } from "@/lib/types/common";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/notifications/notify";
import { notifyNotImplemented } from "@/lib/ui/notifications/notifyNotImplemented";
import { FileUploadField } from "@/lib/ui/singleton-forms/FileUploadField";
import { snakeCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { DatasetUploadForm } from "../DatasetUploadForm";

type Props = BoxProps;
export function ManualUploadView({ ...props }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();

  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [loadCSVResult, setLoadCSVResult] = useState<DuckDBLoadCSVResult>();
  const [previewRows, setPreviewRows] = useState<UnknownObject[]>();
  const [loadCSV, isLoadingCSV] = useMutation({
    mutationFn: async (file: File) => {
      const csvName = file.name;

      // load the file into DuckDB
      const loadResult = await DuckDBClient.loadCSV({
        file,
        csvName,
      });
      // now query the file for the rows to preview
      const previewData = await DuckDBClient.runQuery(
        `SELECT * FROM $table$ LIMIT ${AppConfig.dataManagerApp.maxPreviewRows}`,
        { csvName },
      );
      setLoadCSVResult(loadResult);
      setPreviewRows(previewData.data);
      return loadResult;
    },
    onSuccess: (loadResult: DuckDBLoadCSVResult) => {
      const { numRows: numSuccessRows, numRejectedRows } = loadResult;
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
        console.log("result", loadResult);
      }
    },
  });

  const saveLocalCSVToBackend = async (values: DatasetUploadForm) => {
    // this function can't be called without available file metadata
    invariant(selectedFile, "No file is available");
    invariant(columns, "No columns were detected");
    invariant(userProfile, "No user profile is available");

    const dataset = await DatasetClient.insertLocalCSVDataset({
      workspaceId: workspace.id,
      datasetName: values.name,
      datasetDescription: values.description,

      // TODO(jpsyx): get this inferred info from DuckDB
      delimiter: ",",
      sizeInBytes: selectedFile.size,
      columns: columns.map(snakeCaseKeysShallow),
    });
    queryClient.invalidateQueries({
      queryKey: DatasetClient.QueryKeys.getAll(),
    });

    // TODO(jpsyx): we dont need to save to Dexie?
    // TODO(jpsyx): perhaps save duckdb to Dexie instead now?
    /*
    // and also save the raw data locally to Dexie
    const rawDataString = unparseDataset({
      datasetType: MIMEType.TEXT_CSV,
      data: csv.data,
    });

    await DatasetRawDataClient.insert({
      data: {
        createdAt: new Date(),
        updatedAt: new Date(),
        datasetId: dataset.id,
        sourceType: "local_csv",
        ownerId: workspace.ownerId,
        ownerProfileId: userProfile.profileId,
        workspaceId: workspace.id,
        data: rawDataString,
      },
    });
    */

    return dataset;
  };

  const columns = useMemo(() => {
    return loadCSVResult?.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        dataType: duckDataTypeToDatasetDataType(duckColumn.column_type),
        columnIdx: idx,
      };
    });
  }, [loadCSVResult]);

  const onFileSubmit = (file: File | undefined) => {
    if (file) {
      setSelectedFile(file);
      loadCSV(file);
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

        {columns && previewRows && selectedFile ?
          <DatasetUploadForm
            defaultName={selectedFile.name}
            rows={previewRows}
            columns={columns}
            doDatasetSave={saveLocalCSVToBackend}
          />
        : null}

        <Dropzone.FullScreen
          onDrop={(files: FileWithPath[]) => {
            console.log(files);
            notifyNotImplemented();
            /*
            const uploadedFile = files[0];
            if (uploadedFile) {
              parseFile(uploadedFile);
            }
            */
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
