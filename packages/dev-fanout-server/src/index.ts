import Fastify from "fastify";
import { registerForwardRoute } from "./routes/forward";
import { registerNgrokURLRoutes } from "./routes/ngrok-url";

function _getPort(): number {
  const defaultPort: number = 8080;
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

/**
 * This is the main entry point for the Fastify server.
 */
async function main(): Promise<void> {
  const server = Fastify({
    logger: true,
  });

  server.addContentTypeParser(
    "*",
    { parseAs: "buffer" },
    (_request, body, done) => {
      done(null, body);
    },
  );

  // register endpoints
  server.get("/healthz", async () => {
    return { ok: true };
  });
  await server.register(registerForwardRoute);
  await server.register(registerNgrokURLRoutes);

  // start server listening
  const host: string = _getHost();
  const port: number = _getPort();
  await server.listen({ host, port });
}

void main();
