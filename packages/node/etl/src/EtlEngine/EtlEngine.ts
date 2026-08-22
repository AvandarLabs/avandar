import type {
  BaseModule,
  Module,
  ModuleFactory,
  StateOfModule,
} from "@avandar/modules";
import type { MIMEType, UUID } from "@avandar/utils";
import type { TransformedDataDescriptionForParquet } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";

import { createModuleFactory } from "@avandar/modules";
import { getEtlLoadDir, getEtlOutputDir } from "@etl/EtlEngine/etlPaths";
import { transformedCsvsToParquetBlobs } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
 * Each column entry must include a `type` (`DuckDbSniffableDataType`), unless
 * `columns` is empty and the pipeline relies on full CSV inference.
 */
type EtlContext = {
  pipelineRunId: PipelineRunId;
};

type IEtlEngine = Module<
  "EtlEngine",
  {
    /** The ETL pipeline name. Named after the data source it will process. */
    name: string;
    extract: (etlContext: EtlContext) => PromisedOrValue<ExtractedDataContext>;
    transform: (
      extractedDataContext: ExtractedDataContext,
      etlContext: EtlContext,
    ) => PromisedOrValue<TransformedDataDescriptionForParquet[]>;
    load: (options: {
      pipelineName: string;
      pipelineRunId: PipelineRunId;
      parquetTableBaseNames: readonly string[];
    }) => Promise<void>;
  },
  {
    run: () => Promise<EtlContext>;
  }
>;

/**
 * Copies `extract/<name>.csv` to `transform/<name>.csv` when the extract file
 * exists; otherwise the transform path must already exist (non-identity
 * transform).
 */
async function _ensureTransformCsvsFromExtractOrTransform(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
  descriptions: readonly TransformedDataDescriptionForParquet[];
}): Promise<void> {
  const { pipelineName, pipelineRunId, descriptions } = options;
  const extractDir = getEtlOutputDir(pipelineName, pipelineRunId, "extract");
  const transformDir = getEtlOutputDir(
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
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
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
    getEtlOutputDir(pipelineName, pipelineRunId, "extract"),
    getEtlOutputDir(pipelineName, pipelineRunId, "transform"),
    getEtlLoadDir(pipelineName, pipelineRunId),
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
  const loadDir = getEtlLoadDir(pipelineName, pipelineRunId);
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
  const extractDir = getEtlOutputDir(pipelineName, pipelineRunId, "extract");
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
  const loadDir = getEtlLoadDir(pipelineName, pipelineRunId);
  return join(loadDir, `${tableBaseName}.parquet`);
}

const OPENDATA_BUCKET_DEFAULT = "opendata";

const PARQUET_STORAGE_CONTENT_TYPE = "application/vnd.apache.parquet";

/**
 * Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, optional
 * `SUPABASE_OPENDATA_BUCKET` (defaults to `opendata`).
 */
function _createSupabaseClientForOpenDataUpload() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "uploadParquetToStorage requires SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Uploads each load-stage Parquet file to Supabase Storage at
 * `{bucket}/{pipelineName}/datasets/{table}.parquet`, replacing any prior
 * object with the same path (`upsert`).
 *
 * @param options.pipelineName Folder segment for this pipeline (e.g.
 * `world-bank__wdi`).
 * @param options.pipelineRunId Current run id (resolves local Parquet paths).
 * @param options.parquetTableBaseNames Transform table names (without
 * `.parquet`).
 */
async function uploadParquetToStorage(options: {
  pipelineName: string;
  pipelineRunId: PipelineRunId;
  parquetTableBaseNames: readonly string[];
}): Promise<void> {
  const { pipelineName, pipelineRunId, parquetTableBaseNames } = options;
  const bucket =
    process.env.SUPABASE_OPENDATA_BUCKET ?? OPENDATA_BUCKET_DEFAULT;
  const supabase = _createSupabaseClientForOpenDataUpload();
  const prefix = `${pipelineName}/datasets`;

  const uploadTasks = parquetTableBaseNames.map(async (tableBaseName) => {
    const localPath = getLoadParquetPathForTable({
      pipelineName,
      pipelineRunId,
      tableBaseName,
    });
    const bytes = await readFile(localPath);
    const objectPath = `${prefix}/${tableBaseName}.parquet`;
    // Same object path every run (no pipelineRunId), so re-runs replace files.
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, bytes, {
        contentType: PARQUET_STORAGE_CONTENT_TYPE,
        upsert: true,
      });
    if (error) {
      throw new Error(
        `Supabase upload failed for ${objectPath}: ${error.message}`,
      );
    }
  });
  await Promise.all(uploadTasks);
  console.log(
    `[ETL] Uploaded ${String(parquetTableBaseNames.length)} Parquet ` +
      `file(s) to ${bucket}/${prefix}/`,
  );
}

const EtlEngineFactory = createModuleFactory<IEtlEngine>("EtlEngine", {
  // TODO(jpsyx): fix the types of `childBuilder` to better support factory
  // patterns in modules
  // @ts-expect-error - this needs to be fixed
  childBuilder: (
    accessors: BaseModule<
      "EtlEngine",
      StateOfModule<IEtlEngine>,
      { run: () => Promise<EtlContext> }
    >,
  ) => {
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

        await _ensureTransformCsvsFromExtractOrTransform({
          pipelineName,
          pipelineRunId,
          descriptions: transformedDataDescriptions,
        });

        const transformDir = getEtlOutputDir(
          pipelineName,
          pipelineRunId,
          "transform",
        );
        const parquetBlobs = await transformedCsvsToParquetBlobs({
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
 * The public shape of {@link EtlEngine}: the module factory plus the helper
 * functions attached to it.
 *
 * This is written out explicitly rather than left to inference. `Accessors`
 * (which `ModuleFactory` builds on) types its `set()` method with type-fest's
 * `Paths<State>`. Inferring the type of a concrete module value therefore
 * forces TypeScript to serialise that generic during declaration emit, which
 * failed three ways at once: `TS2527` (references an inaccessible unique
 * symbol), `TS2742` (cannot be named without a non-portable path into
 * `type-fest/source/internal`), and `TS7056` (inferred type too long to
 * serialise). Naming the type keeps the emitted declaration pointing at
 * `@avandar/modules` exports instead of expanding type-fest internals.
 *
 * Any package that exports a concrete `createModule` value needs the same
 * treatment. `@avandar/logger` escapes it only because it exports functions
 * and named types rather than a module instance.
 */
export type EtlEngineApi = ModuleFactory<IEtlEngine> & {
  storeExtractedData: typeof storeExtractedData;
  getLoadParquetPathForTable: typeof getLoadParquetPathForTable;
  uploadParquetToStorage: typeof uploadParquetToStorage;
};

/**
 * Factory for ETL pipelines plus helpers for extract paths and load Parquet
 * paths.
 */
export const EtlEngine: EtlEngineApi = Object.assign(EtlEngineFactory, {
  storeExtractedData,
  getLoadParquetPathForTable,
  uploadParquetToStorage,
});
