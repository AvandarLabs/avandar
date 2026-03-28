import { randomUUID } from "node:crypto";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getETLLoadDir,
  getETLOutputDir,
} from "@etl-engine/ETLEngine/etlPaths.ts";
import { transformedCSVsToParquetBlobs } from "@etl-engine/ETLEngine/transformedCSVsToParquetBlobs.ts";
import { createModuleFactory } from "@modules/createModuleFactory.ts";
import type { TransformedDataDescriptionForParquet } from "@etl-engine/ETLEngine/transformedCSVsToParquetBlobs.ts";
import type {
  Accessors,
  Module,
  StateOfModule,
} from "@modules/createModule.ts";
import type { MIMEType, UUID } from "@utils/types/common.types.ts";

type PipelineRunId = UUID<"PipelineRun">;
type PromisedOrValue<T> = Promise<T> | T;

/**
 * The output of the Extract step is metadata about the generated files,
 * and an optional context object. The optional context object is used to
 * store any metadata that the Transform step needs to do its job.
 *
 * The extracted data is written to
 * `etl-output/<pipeline-name>/<pipelineRunId>/extract`. The extracted data can
 * consist of one or more files, whose names are specified in the `files`
 * array.
 */
type ExtractedDataContext = {
  files: ReadonlyArray<{
    name: string;
    mimeType: MIMEType;
  }>;
  context?: unknown;
};

/**
 * The output of the Transform step is an object describing the transformed
 * data. For identity transforms, CSVs live under the extract directory; the
 * engine copies `extract/<name>.csv` to `transform/<name>.csv` before Parquet
 * conversion when the extract file exists.
 *
 * After CSVs exist under the transform directory, the ETL module converts
 * each to ZSTD Parquet in `etl-output/<pipeline-name>/<pipelineRunId>/load`
 * as `<name>.parquet`.
 *
 * Each column entry must include a `type` (`DuckDBSniffableDataType`), unless
 * `columns` is empty and the pipeline relies on full CSV inference.
 */
type ETLContext = {
  pipelineRunId: PipelineRunId;
};

type IETLEngine = Module<
  "ETLEngine",
  {
    /** The ETL pipeline name. Named after the data source it will process. */
    name: string;
    extract: (etlContext: ETLContext) => PromisedOrValue<ExtractedDataContext>;
    transform: (
      extractedDataContext: ExtractedDataContext,
      etlContext: ETLContext,
    ) => PromisedOrValue<TransformedDataDescriptionForParquet[]>;
    load: (options: {
      pipelineName: string;
      pipelineRunId: PipelineRunId;
      parquetTableBaseNames: readonly string[];
    }) => Promise<void>;
  },
  {
    run: () => Promise<ETLContext>;
  }
>;

/**
 * Copies `extract/<name>.csv` to `transform/<name>.csv` when the extract file
 * exists; otherwise the transform path must already exist (non-identity
 * transform).
 */
async function _ensureTransformCSVsFromExtractOrTransform(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
  descriptions: readonly TransformedDataDescriptionForParquet[];
}): Promise<void> {
  const { pipelineName, pipelineRunId, descriptions } = options;
  const extractDir = getETLOutputDir(pipelineName, pipelineRunId, "extract");
  const transformDir = getETLOutputDir(
    pipelineName,
    pipelineRunId,
    "transform",
  );
  const copyTasks = descriptions.map(async (description) => {
    const src = join(extractDir, `${description.name}.csv`);
    const dest = join(transformDir, `${description.name}.csv`);
    try {
      await copyFile(src, dest);
    } catch (error: unknown) {
      const code =
        (
          error !== null &&
          typeof error === "object" &&
          "code" in error &&
          typeof error.code === "string"
        ) ?
          error.code
        : undefined;
      if (code !== "ENOENT") {
        throw error;
      }
      try {
        await access(dest);
      } catch {
        throw new Error(
          `Missing CSV for "${description.name}": expected ${src} or ${dest}.`,
        );
      }
    }
  });
  await Promise.all(copyTasks);
}

/**
 * Ensures pipeline directories exist: extract, transform, and load.
 */
async function _ensurePipelineDirectories(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
}): Promise<void> {
  const { pipelineName, pipelineRunId } = options;
  const dirs = [
    getETLOutputDir(pipelineName, pipelineRunId, "extract"),
    getETLOutputDir(pipelineName, pipelineRunId, "transform"),
    getETLLoadDir(pipelineName, pipelineRunId),
  ];
  await Promise.all(
    dirs.map((dirPath) => {
      return mkdir(dirPath, { recursive: true });
    }),
  );
}

/** JSON sidecar by Parquet outputs for manual review of transform metadata. */
const TRANSFORM_CSV_DESCRIPTIONS_JSON_FILE = "transform-csv-descriptions.json";

/**
 * Writes Parquet blobs to
 * `etl-output/<pipeline-name>/<pipelineRunId>/load/<name>.parquet`, and
 * {@link TRANSFORM_CSV_DESCRIPTIONS_JSON_FILE} with the transform
 * descriptions (column names and sniffable types).
 */
async function _writeParquetBlobsToLoadDir(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
  descriptions: readonly TransformedDataDescriptionForParquet[];
  parquetBlobs: readonly Blob[];
}): Promise<void> {
  const { pipelineName, pipelineRunId, descriptions, parquetBlobs } = options;
  const loadDir = getETLLoadDir(pipelineName, pipelineRunId);
  await mkdir(loadDir, { recursive: true });
  const writeTasks = descriptions.map(async (description, index) => {
    const blob = parquetBlobs[index];
    if (!blob) {
      throw new Error(
        `Missing Parquet blob for transformed table "${description.name}".`,
      );
    }
    const outPath = join(loadDir, `${description.name}.parquet`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(outPath, bytes);
  });
  await Promise.all(writeTasks);
  const descriptionsPath = join(loadDir, TRANSFORM_CSV_DESCRIPTIONS_JSON_FILE);
  await writeFile(
    descriptionsPath,
    `${JSON.stringify(descriptions, undefined, 2)}\n`,
    "utf8",
  );
}

/**
 * Copies a source file into the extract output directory for this run.
 *
 * @param options.pipelineName Pipeline folder name under `etl-output`.
 * @param options.pipelineRunId Run identifier.
 * @param options.sourcePath Absolute or relative path to the file to copy.
 * @param options.destinationBasename Filename in the extract directory
 * (e.g. `WDIData.csv`).
 */
async function storeExtractedData(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
  sourcePath: string;
  destinationBasename: string;
}): Promise<void> {
  const { pipelineName, pipelineRunId, sourcePath, destinationBasename } =
    options;
  const extractDir = getETLOutputDir(pipelineName, pipelineRunId, "extract");
  await mkdir(extractDir, { recursive: true });
  const dest = join(extractDir, destinationBasename);
  await copyFile(sourcePath, dest);
}

/**
 * Absolute path to a Parquet file produced for the load stage.
 *
 * @param options.tableBaseName Table key without `.parquet` (matches transform
 * `name`).
 */
function getLoadParquetPathForTable(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
  tableBaseName: string;
}): string {
  const { pipelineName, pipelineRunId, tableBaseName } = options;
  const loadDir = getETLLoadDir(pipelineName, pipelineRunId);
  return join(loadDir, `${tableBaseName}.parquet`);
}

const ETLEngineFactory = createModuleFactory<IETLEngine>("ETLEngine", {
  childBuilder(
    accessors: Accessors<
      "ETLEngine",
      StateOfModule<IETLEngine>,
      { run: () => Promise<ETLContext> }
    >,
  ) {
    const pipelineRunId = randomUUID() as PipelineRunId;

    return {
      run: async () => {
        const {
          name: pipelineName,
          extract,
          transform,
          load,
        } = accessors.getState();
        await _ensurePipelineDirectories({ pipelineName, pipelineRunId });

        const extractedDataContext = await extract({ pipelineRunId });
        const transformedDataDescriptions = await transform(
          extractedDataContext,
          {
            pipelineRunId,
          },
        );

        await _ensureTransformCSVsFromExtractOrTransform({
          pipelineName,
          pipelineRunId,
          descriptions: transformedDataDescriptions,
        });

        const transformDir = getETLOutputDir(
          pipelineName,
          pipelineRunId,
          "transform",
        );
        const parquetBlobs = await transformedCSVsToParquetBlobs({
          transformOutputDir: transformDir,
          descriptions: transformedDataDescriptions,
        });

        await _writeParquetBlobsToLoadDir({
          pipelineName,
          pipelineRunId,
          descriptions: transformedDataDescriptions,
          parquetBlobs,
        });

        const parquetTableBaseNames = transformedDataDescriptions.map(
          (description) => {
            return description.name;
          },
        );

        await load({
          pipelineName,
          pipelineRunId,
          parquetTableBaseNames,
        });

        return { pipelineRunId };
      },
    };
  },
});

/**
 * Factory for ETL pipelines plus helpers for extract paths and load Parquet
 * paths.
 */
export const ETLEngine = Object.assign(ETLEngineFactory, {
  storeExtractedData,
  getLoadParquetPathForTable,
});
