import "@pipeline-server/ensureEtlPathsRoot";
import { createParquetCopyBuildQueue } from "@pipeline-server/createParquetCopyBuildQueue";
import { removeLeftoverCopyTempDirs } from "@pipeline-server/openDataParquetCache/removeLeftoverCopyTempDirs/removeLeftoverCopyTempDirs";
import { createOpenDataCacheRoutes } from "@pipeline-server/routes/open-data-cache/createOpenDataCacheRoutes";
import { registerPipelineRoutes } from "@pipeline-server/routes/pipeline-name/registerPipelineRoutes";
import Fastify from "fastify";

function _getPort(): number {
  const defaultPort: number = 4611;
  const rawPort: string | undefined = process.env.PORT;
  if (!rawPort) {
    return defaultPort;
  }
  const parsedPort: number = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(parsedPort)) {
    return defaultPort;
  }
  return parsedPort;
}

function _getHost(): string {
  return process.env.HOST ?? "0.0.0.0";
}

async function main(): Promise<void> {
  const server = Fastify({
    logger: true,
  });

  server.get("/healthz", async () => {
    return { ok: true };
  });

  await server.register(registerPipelineRoutes);

  // Runs before any build is queued, so every folder it finds belongs to a
  // build a deploy or crash killed.
  const leftoverDirs = await removeLeftoverCopyTempDirs();
  if (leftoverDirs.length > 0) {
    server.log.warn(
      { leftoverDirs },
      "Deleted temp folders left by killed Parquet copy builds",
    );
  }
  const copyQueue = createParquetCopyBuildQueue(server.log);
  await server.register(
    createOpenDataCacheRoutes({ enqueueBuild: copyQueue.enqueue }),
  );

  await server.listen({
    host: _getHost(),
    port: _getPort(),
  });
}

void main();
