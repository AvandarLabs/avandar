import Fastify from "fastify";
import { registerPipelineRoutes } from "./routes/pipeline-name/registerPipelineRoutes";

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

  await server.listen({
    host: _getHost(),
    port: _getPort(),
  });
}

void main();
