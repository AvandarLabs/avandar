import { useLingui } from "@lingui/react/macro";
import { Radio, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getOutputModeCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/PdfParseControls/getOutputModeCopy/getOutputModeCopy";
import { PdfRegionPicker } from "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker/PdfRegionPicker";
import { PdfReviewGrid } from "@/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfReviewGrid/PdfReviewGrid";
import {
  combineRegions,
  OBSERVATION_HEADER,
} from "@/workers/pdfSniff/combineRegions/combineRegions";
import { resolveOutputMode } from "@/workers/pdfSniff/resolveOutputMode/resolveOutputMode";
import type { PdfOutputMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";
import type {
  DataSourceMetadata,
  PdfDataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { FileParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type {
  BBox,
  ExtractedTable,
  PdfRegion,
} from "@/workers/pdfSniff/pdfSniff.types";
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
  const { i18n } = useLingui();
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

  /*
   * The same re-parse a region change goes through, because the output shape
   * is decided inside `combineRegions` during extraction rather than after
   * it. Reshaping the rows we already have on this side would mean a second
   * implementation of the union rule, and the two would drift.
   */
  const onOutputModeChange = (mode: PdfOutputMode): void => {
    // The flag rides along with the mode, and is what stops the next
    // extraction re-deriving a default over the top of this choice. It is the
    // same distinction `isShapeUserChosen` draws for a region's shape.
    onRequestDataReparse(
      changeParseOptions({ outputMode: mode, isOutputModeUserChosen: true }),
    );
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

  /*
   * The same resolver the worker used, over the same inputs, so the shape the
   * control shows is the shape the rows below it were built with. Only a mode
   * the user picked is offered as their choice: passing the resolved one back
   * in would make every extraction look like a decision.
   */
  const resolution = resolveOutputMode({
    tables: loadResult.tables,
    shapesByRegionId: Object.fromEntries(
      regions.map((region) => {
        return [region.id, region.shape];
      }),
    ),
    chosenMode:
      metadata.parseOptions.isOutputModeUserChosen === true
        ? metadata.parseOptions.outputMode
        : undefined,
  });
  const copy = getOutputModeCopy({
    i18n,
    resolution,
    observationColumns: OBSERVATION_HEADER,
    graphicKind: regions
      .map((region) => {
        return loadResult.classifications[region.id]?.graphicKind;
      })
      .find((kind) => {
        return kind !== undefined;
      }),
    isUserChosen: metadata.parseOptions.isOutputModeUserChosen === true,
    regionNames: regions.map((region) => {
      return region.label;
    }),
  });

  return (
    <Stack gap="md" w="100%">
      <Stack gap={4}>
        <Radio.Group
          size="xs"
          label={copy.groupLabel}
          value={resolution.mode}
          onChange={(value) => {
            onOutputModeChange(value as PdfOutputMode);
          }}
        >
          <Stack gap={4} mt={4}>
            <Radio
              value="natural"
              label={copy.keepLabel}
              description={copy.keepDescription}
              disabled={!resolution.isKeepAvailable}
            />
            <Radio
              value="observations"
              label={copy.normaliseLabel}
              description={copy.normaliseDescription}
            />
          </Stack>
        </Radio.Group>
        {copy.note ? (
          <Text size="xs" c="dimmed">
            {copy.note}
          </Text>
        ) : null}
      </Stack>
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
      {activeTable ? (
        <PdfReviewGrid
          table={activeTable}
          onTableChange={applyReviewedTable}
          onRowFocus={setFocusedProvenance}
        />
      ) : null}
    </Stack>
  );
}
