import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ETLEngine } from "@ava-etl/ETLEngine/ETLEngine";
import {
  getETLOutputDir,
  getETLPipelineInputDir,
} from "@ava-etl/ETLEngine/etlPaths";
import { NodeDuckDB } from "@ava-etl/NodeDuckDB/NodeDuckDB";
import { MIMEType } from "@utils/types/common.types";
import type { TransformedDataDescriptionForParquet } from "@ava-etl/ETLEngine/transformedCSVsToParquetBlobs";

const PIPELINE_NAME = "world-bank__wdi" as const;

const worldBankWdiETL = ETLEngine.create({
  name: PIPELINE_NAME,
  extract: async ({ pipelineRunId }) => {
    const inputDir = getETLPipelineInputDir(PIPELINE_NAME);
    await mkdir(inputDir, { recursive: true });
    const entries = await readdir(inputDir);
    const csvFilenames = entries
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
      csvFilenames.map(async (destinationBasename) => {
        const sourcePath = join(inputDir, destinationBasename);
        await ETLEngine.storeExtractedData({
          pipelineName: PIPELINE_NAME,
          pipelineRunId,
          sourcePath,
          destinationBasename,
        });
      }),
    );

    return {
      files: csvFilenames.map((name) => {
        return { name, mimeType: MIMEType.TEXT_CSV };
      }),
      context: {},
    };
  },
  transform: async (extracted, { pipelineRunId }) => {
    const extractDir = getETLOutputDir(PIPELINE_NAME, pipelineRunId, "extract");
    const csvFilenames = extracted.files
      .filter((file) => {
        return file.name.toLowerCase().endsWith(".csv");
      })
      .map((file) => {
        return file.name;
      });

    const db = new NodeDuckDB();
    try {
      const descriptions: TransformedDataDescriptionForParquet[] = [];
      for (const filename of csvFilenames) {
        const baseName = filename.replace(/\.csv$/i, "");
        const csvPath = join(extractDir, filename);
        const columns = await db.sniffCSV({ csvPath });
        descriptions.push({ name: baseName, columns });
      }
      return descriptions;
    } finally {
      await db.close();
    }
  },
  load: async ({ pipelineName, pipelineRunId, parquetTableBaseNames }) => {
    const db = new NodeDuckDB();
    try {
      for (const tableBaseName of parquetTableBaseNames) {
        const parquetPath = ETLEngine.getLoadParquetPathForTable({
          pipelineName,
          pipelineRunId,
          tableBaseName,
        });
        const summary = await db.summarizeParquetFile(parquetPath);
        const columnList = summary.columnNames.join(", ");
        console.log(
          `[WDI load] ${tableBaseName}: rows=${String(summary.rowCount)} ` +
            `columns=${columnList}`,
        );
      }
      await ETLEngine.uploadParquetToStorage({
        pipelineName,
        pipelineRunId,
        parquetTableBaseNames,
      });
    } finally {
      await db.close();
    }
  },
});

/**
 * Runs the World Bank WDI pipeline and returns the pipeline run id.
 */
export async function run(): Promise<string> {
  const { pipelineRunId } = await worldBankWdiETL.run();
  return pipelineRunId;
}
