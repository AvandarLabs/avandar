import { FastifyPluginAsync } from "fastify";
import { run } from "./run/run";
import type { FastifyReply, FastifyRequest } from "fastify";

type RunPipelineRequest = FastifyRequest<{
  Params: {
    pipelineName: string;
  };
}>;

function _getServerSecret(): string | undefined {
  const rawSecret: string | undefined = process.env.AVA_PIPELINE_SERVER_SECRET;
  return rawSecret?.trim();
}

function _getBearerToken(authorizationHeader: unknown): string | undefined {
  const prefix = "Bearer ";
  if (
    typeof authorizationHeader !== "string" ||
    !authorizationHeader.startsWith(prefix)
  ) {
    return undefined;
  }
  return authorizationHeader.slice(prefix.length).trim();
}

async function _requireRunAuth(options: {
  request: FastifyRequest;
  reply: FastifyReply;
}): Promise<FastifyReply | undefined> {
  const pipelineServerSecret: string | undefined = _getServerSecret();

  if (!pipelineServerSecret) {
    return await options.reply.status(500).send({
      ok: false,
      error: "Server is missing AVA_PIPELINE_SERVER_SECRET.",
    });
  }

  const actualSecret: string | undefined = _getBearerToken(
    options.request.headers.authorization,
  );

  if (actualSecret !== pipelineServerSecret) {
    return await options.reply.status(401).send({
      ok: false,
      error: "Unauthorized.",
    });
  }

  return undefined;
}

export const registerPipelineRoutes: FastifyPluginAsync = async (server) => {
  server.post(
    "/:pipelineName/run",
    async (request: RunPipelineRequest, reply: FastifyReply) => {
      const authError = await _requireRunAuth({ request, reply });
      if (authError) {
        return authError;
      }

      try {
        const result: string = await run({
          pipelineName: request.params.pipelineName,
        });

        reply.type("text/plain; charset=utf-8");
        return await reply.send(result);
      } catch (error: unknown) {
        const message: string =
          error instanceof Error ? error.message : "Unknown error";

        return await reply.status(500).send({
          ok: false,
          error: message,
        });
      }
    },
  );
};
