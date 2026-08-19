import { Stack } from "@mantine/core";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PdfRegionPicker } from "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker";
import { PdfReviewGrid } from "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfReviewGrid";
import type {
  DataSourceMetadata,
  PdfDataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { FileParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type { BBox, ExtractedTable, PdfRegion } from "@/workers/pdfSniff/types";
import type { ReactNode } from "react";

type Props = {
  /** The uploaded PDF, needed to render the page the user draws on. */
  sourceFile: File;
  metadata: PdfDataSourceMetadata;
  onDataSourceMetadataChange: (options: DataSourceMetadata) => void;
  onRequestDataReparse: (parseOptions: FileParseOptions) => void;
};

/**
 * What a PDF import is parameterised by: which parts of the page to read.
 *
 * Changing a region goes back through the normal re-parse path rather than a
 * parallel one, so a re-extraction is indistinguishable from any other
 * re-parse and the picker cannot drift away from what the form will save.
 *
 * `ManualUploadView` keys the whole import form on the load result's id, and
 * a re-parse mints a fresh one, so the local state here is rebuilt from the
 * new extraction on every round trip rather than needing to be synced.
 */
export function PdfParseControls({
  sourceFile,
  metadata,
  onDataSourceMetadataChange,
  onRequestDataReparse,
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const loadResult = metadata.datasetLoadResult;

  const [activeRegionId, setActiveRegionId] = useState<string | null>(
    loadResult.tables[0]?.regionId ?? null,
  );
  const [tables, setTables] = useState<readonly ExtractedTable[]>(
    loadResult.tables,
  );
  const [focusedProvenance, setFocusedProvenance] = useState<
    { page: number; bbox: BBox } | undefined
  >();

  const changeParseOptions = (
    patch: Partial<PdfDataSourceMetadata["parseOptions"]>,
  ): PdfDataSourceMetadata["parseOptions"] => {
    const parseOptions = { ...metadata.parseOptions, ...patch };
    onDataSourceMetadataChange({ ...metadata, parseOptions });
    return parseOptions;
  };

  const handleRegionsChange = (regions: readonly PdfRegion[]): void => {
    onRequestDataReparse(changeParseOptions({ regions }));
  };

  const handleTableChange = (table: ExtractedTable): void => {
    setTables((currentTables) => {
      return currentTables.map((currentTable) => {
        return currentTable.regionId === table.regionId ? table : currentTable;
      });
    });
  };

  const activeTable = tables.find((table) => {
    return table.regionId === activeRegionId;
  });

  return (
    <Stack gap="md" w="100%">
      <PdfRegionPicker
        file={sourceFile}
        pageCount={loadResult.pageCount}
        pages={loadResult.pages}
        regions={metadata.parseOptions.regions ?? []}
        tables={tables}
        classifications={loadResult.classifications}
        activeRegionId={activeRegionId}
        focusedProvenance={focusedProvenance}
        workspaceId={workspace.id}
        userId={user?.id}
        onRegionsChange={handleRegionsChange}
        onActiveRegionChange={setActiveRegionId}
        onTableChange={handleTableChange}
        onLlmModelUsed={(llmModel) => {
          changeParseOptions({ llmModel });
        }}
      />
      {activeTable && (
        <PdfReviewGrid
          table={activeTable}
          onTableChange={handleTableChange}
          onRowFocus={setFocusedProvenance}
        />
      )}
    </Stack>
  );
}
