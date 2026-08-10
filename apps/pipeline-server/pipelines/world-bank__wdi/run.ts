import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  EtlEngine,
  getEtlOutputDir,
  getEtlPipelineInputDir,
  NodeDuckDb,
} from "@avandar/etl";
import { MIMEType } from "@avandar/utils";
import {
  createSupabaseAdminClient,
  getWdiYearCoverageFromParquet,
  upsertWorldBankWdiCatalogEntry,
} from "@pipelines/world-bank__wdi/catalogOpenDataInsert";
import type { TransformedDataDescriptionForParquet } from "@avandar/etl";
import type { WdiTableParquetSummary } from "@pipelines/world-bank__wdi/catalogOpenDataInsert";

const PIPELINE_NAME = "world-bank__wdi" as const;

const worldBankWdiEtl = EtlEngine.create({
  name: PIPELINE_NAME,
  extract: async ({ pipelineRunId }) => {
    const inputDir = getEtlPipelineInputDir(PIPELINE_NAME);
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
        await EtlEngine.storeExtractedData({
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
    const extractDir = getEtlOutputDir(PIPELINE_NAME, pipelineRunId, "extract");
    const csvFilenames = extracted.files
      .filter((file) => {
        return file.name.toLowerCase().endsWith(".csv");
      })
      .map((file) => {
        return file.name;
      });

    const db = new NodeDuckDb();
    try {
      const descriptions: TransformedDataDescriptionForParquet[] = [];
      for (const filename of csvFilenames) {
        const baseName = filename.replace(/\.csv$/i, "");
        const csvPath = join(extractDir, filename);
        const columns = await db.sniffCsv({ csvPath });
        descriptions.push({ name: baseName, columns });
      }
      return descriptions;
    } finally {
      await db.close();
    }
  },
  load: async ({ pipelineName, pipelineRunId, parquetTableBaseNames }) => {
    const db = new NodeDuckDb();
    try {
      const tableSummaries: WdiTableParquetSummary[] = [];

      for (const tableBaseName of parquetTableBaseNames) {
        const parquetPath = EtlEngine.getLoadParquetPathForTable({
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
        const yearCoverage = await getWdiYearCoverageFromParquet({
          db,
          parquetPath,
          columnNames: summary.columnNames,
        });
        tableSummaries.push({
          tableBaseName,
          rowCount: summary.rowCount,
          columnNames: summary.columnNames,
          columnTypeDescriptions: summary.columnTypeDescriptions,
          yearCoverage,
        });
      }

      await EtlEngine.uploadParquetToStorage({
        pipelineName,
        pipelineRunId,
        parquetTableBaseNames,
      });

      const supabase = createSupabaseAdminClient();
      await upsertWorldBankWdiCatalogEntry({
        supabase,
        pipelineName,
        pipelineRunId,
        tableSummaries,
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
  const { pipelineRunId } = await worldBankWdiEtl.run();
  return pipelineRunId;
}
