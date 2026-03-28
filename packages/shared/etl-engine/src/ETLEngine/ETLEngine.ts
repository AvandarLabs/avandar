import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createModuleFactory } from "@modules/createModuleFactory.ts";
import { getEtlInputDir, getEtlLoadDir, getEtlOutputDir } from "./etlPaths.ts";
import { transformedCsvsToParquetBlobs } from "./transformedCsvsToParquetBlobs.ts";
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
 * The extracted data is written to the ETL's `output/<pipelineRunId>/extract`
 * directory. The extracted data can consist of one or more files, whose names
 * are specified in the `filenames` array.
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
 * data. The Transform step is expected to have written the transformed data
 * to an output CSV file in `output/<pipelineRunId>/transform/<name>.csv`.
 *
 * After the Transform step writes a CSV file to disk, the ETL module will
 * use this object to covert it to a compressed parquet file which will be
 * stored in the `output/<pipelineRunId>/load` directory under the name
 * `<name>.parquet`.
 */
type TransformedDataDescription = {
  name: string;
  columns: ReadonlyArray<{
    name: string;
    type:
      | "BOOLEAN"
      | "BIGINT"
      | "DOUBLE"
      | "TIME"
      | "DATE"
      | "TIMESTAMP"
      | "VARCHAR";
  }>;
};

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
    ) => PromisedOrValue<TransformedDataDescription[]>;
    load: (
      parquetBlobs: readonly Blob[],
      etlContext: {
        pipelineRunId: PipelineRunId;
      },
    ) => Promise<void>;
  },
  {
    run: () => Promise<ETLContext>;
  }
>;

/**
 * Ensures pipeline directories exist: extract input, extract/transform outputs,
 * and load.
 */
async function _ensurePipelineDirectories(
  pipelineRunId: PipelineRunId,
): Promise<void> {
  const dirs = [
    getEtlInputDir(pipelineRunId, "extract"),
    getEtlOutputDir(pipelineRunId, "extract"),
    getEtlOutputDir(pipelineRunId, "transform"),
    getEtlLoadDir(pipelineRunId),
  ];
  await Promise.all(
    dirs.map((dirPath) => {
      return mkdir(dirPath, { recursive: true });
    }),
  );
}

/**
 * Writes Parquet blobs to `output/<pipelineRunId>/load/<name>.parquet`.
 */
async function _writeParquetBlobsToLoadDir(options: {
  pipelineRunId: PipelineRunId;
  descriptions: readonly TransformedDataDescription[];
  parquetBlobs: readonly Blob[];
}): Promise<void> {
  const { pipelineRunId, descriptions, parquetBlobs } = options;
  const loadDir = getEtlLoadDir(pipelineRunId);
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
}

export const ETLEngine = createModuleFactory<IETLEngine>("ETLEngine", {
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
        const { extract, transform, load } = accessors.getState();
        await _ensurePipelineDirectories(pipelineRunId);

        const extractedDataContext = await extract({ pipelineRunId });
        const transformedDataDescriptions = await transform(
          extractedDataContext,
          {
            pipelineRunId,
          },
        );

        const transformDir = getEtlOutputDir(pipelineRunId, "transform");
        const parquetBlobs = await transformedCsvsToParquetBlobs({
          transformOutputDir: transformDir,
          descriptions: transformedDataDescriptions,
        });

        await _writeParquetBlobsToLoadDir({
          pipelineRunId,
          descriptions: transformedDataDescriptions,
          parquetBlobs,
        });

        await load(parquetBlobs, { pipelineRunId });

        return { pipelineRunId };
      },
    };
  },
});
