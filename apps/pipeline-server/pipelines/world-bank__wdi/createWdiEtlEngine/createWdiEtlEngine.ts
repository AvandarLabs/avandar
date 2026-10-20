import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  EtlEngine,
  getEtlOutputDir,
  getEtlPipelineInputDir,
  NodeDuckDb,
} from "@avandar/etl";
import { getWdiYearCoverageFromCsv } from "@pipelines/world-bank__wdi/getWdiYearCoverageFromCsv/getWdiYearCoverageFromCsv";
import { makeWdiParquetRelation } from "@pipelines/world-bank__wdi/makeWdiParquetRelation/makeWdiParquetRelation";
import type {
  EtlDestination,
  EtlEngineInstance,
  EtlPipelineRunId,
  EtlStores,
  PipelineParquetRelation,
} from "@avandar/etl";

/** The pipeline's name, its `etl-input/` folder, and its one drive's key. */
export const WDI_PIPELINE_NAME = "world-bank__wdi";

/** The pipeline's one implicit drive: the World Bank's WDI bulk download. */
type WdiDrive = Readonly<{ key: typeof WDI_PIPELINE_NAME }>;

/** One WDI CSV, copied into this run's extract directory. */
type WdiCsvFile = Readonly<{ csvFilename: string; csvPath: string }>;

async function* _extractWdiCsvFiles(
  pipelineRunId: EtlPipelineRunId,
): AsyncGenerator<readonly WdiCsvFile[]> {
  const inputDir = getEtlPipelineInputDir(WDI_PIPELINE_NAME);
  await mkdir(inputDir, { recursive: true });
  const csvFilenames = (await readdir(inputDir))
    .filter((name) => {
      return name.toLowerCase().endsWith(".csv");
    })
    .sort();
  if (csvFilenames.length === 0) {
    throw new Error(
      `No CSV files found under ${inputDir}. Add one or more .csv files.`,
    );
  }
  await Promise.all(
    csvFilenames.map((csvFilename) => {
      return EtlEngine.storeExtractedData({
        pipelineName: WDI_PIPELINE_NAME,
        pipelineRunId,
        sourcePath: join(inputDir, csvFilename),
        destinationBasename: csvFilename,
      });
    }),
  );
  const extractDir = getEtlOutputDir(
    WDI_PIPELINE_NAME,
    pipelineRunId,
    "extract",
  );
  yield csvFilenames.map((csvFilename) => {
    return { csvFilename, csvPath: join(extractDir, csvFilename) };
  });
}

async function _transformWdiCsvFile(
  file: WdiCsvFile,
): Promise<PipelineParquetRelation> {
  const db = new NodeDuckDb();
  try {
    const csvColumns = await db.sniffCsv({ csvPath: file.csvPath });
    const yearCoverage = await getWdiYearCoverageFromCsv({
      db,
      csvPath: file.csvPath,
      columnNames: csvColumns.map((column) => {
        return column.name;
      }),
    });
    return makeWdiParquetRelation({
      tableBaseName: file.csvFilename.replace(/\.csv$/i, ""),
      csvPath: file.csvPath,
      csvColumns,
      yearCoverage,
    });
  } finally {
    await db.close();
  }
}

/**
 * Creates the World Bank WDI pipeline's engine. Every CSV under
 * `etl-input/world-bank__wdi/` becomes one Parquet listing. Full runs only:
 * the bulk download has no per-table modification time to resume from.
 */
export function createWdiEtlEngine(
  args: EtlDestination & Readonly<{ stores?: EtlStores }>,
): EtlEngineInstance {
  return EtlEngine.create<WdiDrive, WdiCsvFile>({
    ...args,
    name: WDI_PIPELINE_NAME,
    listDrives: () => {
      return [{ key: WDI_PIPELINE_NAME }];
    },
    getDriveKey: (drive) => {
      return drive.key;
    },
    extract: ({ pipelineRunId }) => {
      return _extractWdiCsvFiles(pipelineRunId);
    },
    getConnectionId: (file) => {
      return file.csvFilename;
    },
    transform: async ({ connection }) => {
      return [await _transformWdiCsvFile(connection)];
    },
  });
}
