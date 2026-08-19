import { Stack } from "@mantine/core";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PdfRegionPicker } from "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker/PdfRegionPicker";
import { PdfReviewGrid } from "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfReviewGrid/PdfReviewGrid";
import { combineRegions } from "@/workers/pdfSniff/combineRegions/combineRegions";
import type {
  DataSourceMetadata,
  PdfDataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { FileParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type { BBox, ExtractedTable, PdfRegion } from "@/workers/pdfSniff/pdfSniff.types";
import type { ReactNode } from "react";

type Props = {
  /** The uploaded PDF, needed to render the page the user draws on. */
  sourceFile: File;
  metadata: PdfDataSourceMetadata;
  onDataSourceMetadataChange: (options: DataSourceMetadata) => void;
  onRequestDataReparse: (parseOptions: FileParseOptions) => void;
};

/**
 * What a PDF import is parameterised by: which parts of the page to read,
 * and what the user makes of what was read there.
 *
 * Changing a region goes back through the normal re-parse path rather than a
 * parallel one, so a re-extraction is indistinguishable from any other
 * re-parse and the picker cannot drift away from what the form will save.
 *
 * Review corrections and model-assisted rows are deliberately *not* held in
 * local state here. They are written straight back into `datasetLoadResult`,
 * because `combinedCells` is what the save builds the dataset from, and the
 * whole point of the review grid is that the saved rows are the reviewed
 * ones. Keeping a private copy is how the two drift apart, and the drift is
 * invisible until someone queries the dataset and finds the value they
 * corrected still wrong.
 *
 * The load result's id is untouched by a review, so `ManualUploadView`'s
 * `key` stays stable and no remount discards the work. A region change does
 * mint a new id, which is correct: that is a genuinely new extraction.
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
  const regions = metadata.parseOptions.regions ?? [];

  const [activeRegionId, setActiveRegionId] = useState<string | null>(
    loadResult.tables[0]?.regionId ?? null,
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

  const onRegionsChange = (nextRegions: readonly PdfRegion[]): void => {
    onRequestDataReparse(changeParseOptions({ regions: nextRegions }));
  };

  /**
   * Folds one region's reviewed table back into the combined result, and any
   * parse-option change that belongs with it, in a single update.
   *
   * `combineRegions` is the same pure function the worker calls, run here on
   * the main thread. Round-tripping through the worker instead would mean
   * re-extracting from the page geometry, which would throw away the very
   * corrections being folded in.
   *
   * Both changes go out together because two `onDataSourceMetadataChange`
   * calls in one handler are both derived from the same `metadata` prop, so
   * the second would overwrite the first.
   */
  const applyReviewedTable = (
    table: ExtractedTable,
    parseOptionsPatch: Partial<PdfDataSourceMetadata["parseOptions"]> = {},
  ): void => {
    const tables = loadResult.tables.map((currentTable) => {
      return currentTable.regionId === table.regionId ? table : currentTable;
    });
    const combined = combineRegions({
      tables,
      regionLabels: Object.fromEntries(
        regions.map((region) => {
          return [region.id, region.label];
        }),
      ),
      documentMetadata: loadResult.documentMetadata,
      outputMode: metadata.parseOptions.outputMode,
    });
    onDataSourceMetadataChange({
      ...metadata,
      parseOptions: { ...metadata.parseOptions, ...parseOptionsPatch },
      datasetLoadResult: {
        ...loadResult,
        tables,
        combinedCells: combined.cells,
        combinedHeaderRows: combined.headerRows,
        numRows: Math.max(0, combined.cells.length - combined.headerRows),
      },
    });
  };

  const activeTable = loadResult.tables.find((table) => {
    return table.regionId === activeRegionId;
  });

  return (
    <Stack gap="md" w="100%">
      <PdfRegionPicker
        file={sourceFile}
        pageCount={loadResult.pageCount}
        pages={loadResult.pages}
        regions={regions}
        tables={loadResult.tables}
        classifications={loadResult.classifications}
        activeRegionId={activeRegionId}
        focusedProvenance={focusedProvenance}
        workspaceId={workspace.id}
        userId={user?.id}
        onRegionsChange={onRegionsChange}
        onActiveRegionChange={setActiveRegionId}
        onAssistApplied={({ table, llmModel }) => {
          applyReviewedTable(table, { llmModel });
        }}
      />
      {activeTable ?
        <PdfReviewGrid
          table={activeTable}
          onTableChange={applyReviewedTable}
          onRowFocus={setFocusedProvenance}
        />
      : null}
    </Stack>
  );
}
