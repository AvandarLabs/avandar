import { ETL_RUN_OPTIONS_ERROR_NAME } from "@avandar/etl";
import { run } from "@pipeline-server/routes/pipeline-name/run/run";
import { getEtlRunFailedReport } from "@pipelines/shared/getEtlRunFailedReport/getEtlRunFailedReport";
import { parsePipelineRunOptions } from "@pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions";
import { FastifyPluginAsync } from "fastify";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";
import type { FastifyReply, FastifyRequest } from "fastify";

type RunPipelineRequest = FastifyRequest<{
  Params: {
    pipelineName: string;
  };
  Body:
    | {
        incremental?: unknown;
        since?: unknown;
        until?: unknown;
        limit?: unknown;
        scopes?: unknown;
      }
    | undefined;
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

/**
 * The run body's shape. Unknown keys are rejected, so a typo such as
 * `incremntal` answers 400 instead of silently running in full. This uses
 * `propertyNames`, not `additionalProperties: false`, because Fastify's
 * default Ajv option `removeAdditional: true` would delete the unknown key
 * and let the run through. Values are left untyped here:
 * `parsePipelineRunOptions` validates them.
 */
const RUN_BODY_SCHEMA = {
  type: "object",
  propertyNames: { enum: ["incremental", "since", "until", "limit", "scopes"] },
} as const;

function _getRunErrorStatus(error: unknown): 400 | 500 {
  return error instanceof Error && error.name === ETL_RUN_OPTIONS_ERROR_NAME
    ? 400
    : 500;
}

async function _runPipeline(
  request: RunPipelineRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  if (request.validationError) {
    return await reply.status(400).send({
      ok: false,
      error: `The run body accepts only incremental, since, until, limit, and scopes. ${request.validationError.message}`,
    });
  }

  let options: PipelineRunOptions;
  try {
    options = parsePipelineRunOptions(request.body ?? {});
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : "Invalid run options.";
    return await reply.status(400).send({ ok: false, error: message });
  }

  try {
    const report = await run({
      pipelineName: request.params.pipelineName,
      ...options,
    });
    return await reply.send(report);
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : "Unknown error";
    // When every crawl failed, the report still says what each crawl did.
    const report = getEtlRunFailedReport(error);

    return await reply.status(_getRunErrorStatus(error)).send({
      ok: false,
      error: message,
      ...(report === undefined ? {} : { report }),
    });
  }
}

/**
 * Registers `POST /:pipelineName/run`, which answers with the run's report
 * as JSON. Auth is checked before the body is validated, so an
 * unauthenticated caller gets 401 whatever it sends. Invalid options answer
 * 400, and the pipeline does not run. A run where every crawl failed answers
 * 500 with the error and the report.
 */
export const registerPipelineRoutes: FastifyPluginAsync = async (server) => {
  server.post(
    "/:pipelineName/run",
    {
      schema: { body: RUN_BODY_SCHEMA },
      attachValidation: true,
      preValidation: async (request, reply) => {
        const authError = await _requireRunAuth({ request, reply });
        // A request with no body is a full run, so it validates as `{}`.
        request.body ??= {};
        return authError;
      },
    },
    _runPipeline,
  );
};
