import { createParquetCopyQueue } from "@pipeline-server/openDataParquetCache/createParquetCopyQueue/createParquetCopyQueue";
import { createSupabaseParquetCopyStore } from "@pipeline-server/openDataParquetCache/createSupabaseParquetCopyStore/createSupabaseParquetCopyStore";
import { loadPipelineListingDownload } from "@pipeline-server/openDataParquetCache/loadPipelineListingDownload/loadPipelineListingDownload";
import { runParquetCopyBuild } from "@pipeline-server/openDataParquetCache/runParquetCopyBuild/runParquetCopyBuild";
import { streamUrlToFile } from "@pipeline-server/openDataParquetCache/streamUrlToFile/streamUrlToFile";
import type { ParquetCopyQueue } from "@pipeline-server/openDataParquetCache/createParquetCopyQueue/createParquetCopyQueue";
import type { ParquetCopyBuildRequest } from "@pipeline-server/routes/open-data-cache/createOpenDataCacheRoutes";
import type { FastifyBaseLogger } from "fastify";

/**
 * Creates the queue the server runs requested Parquet copy builds through.
 * Each build reads and writes the Supabase project its request named. A
 * build's outcome is logged with its listing and build id, never with the
 * project's key.
 *
 * @param log - The server's logger.
 */
export function createParquetCopyBuildQueue(
  log: FastifyBaseLogger,
): ParquetCopyQueue<ParquetCopyBuildRequest> {
  return createParquetCopyQueue<ParquetCopyBuildRequest>({
    runJob: async ({
      catalogListingId,
      buildId,
      completeSampleCsv,
      supabase,
    }) => {
      log.info(
        {
          catalogListingId,
          buildId,
          isFromCompleteSample: completeSampleCsv !== undefined,
        },
        "Parquet copy build started",
      );
      const outcome = await runParquetCopyBuild({
        job: { catalogListingId, buildId, completeSampleCsv },
        store: createSupabaseParquetCopyStore(supabase),
        loadPipelineDownload: loadPipelineListingDownload,
        downloadToFile: streamUrlToFile,
      });
      log.info(
        { catalogListingId, buildId, outcome },
        "Parquet copy build finished",
      );
    },
    onJobError: ({ catalogListingId, buildId }, error) => {
      log.error(
        { catalogListingId, buildId, err: error },
        "Parquet copy build could not record its result",
      );
    },
  });
}
