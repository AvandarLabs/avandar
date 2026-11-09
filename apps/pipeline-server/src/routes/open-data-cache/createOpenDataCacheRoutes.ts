import { readSupabaseTarget } from "@pipeline-server/routes/pipeline-name/readSupabaseTarget/readSupabaseTarget";
import { requireServerAuth } from "@pipeline-server/routes/requireServerAuth/requireServerAuth";
import type { ParquetCopyJob } from "@pipeline-server/openDataParquetCache/runParquetCopyBuild/runParquetCopyBuild";
import type { PipelineSupabaseTarget } from "@pipelines/shared/PipelineRunOptions.types";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

/** A requested build, with the Supabase project its request named. */
export type ParquetCopyBuildRequest = ParquetCopyJob &
  Readonly<{ supabase: PipelineSupabaseTarget }>;

type BuildRequest = FastifyRequest<{
  Params: { catalogListingId: string };
  Body: { buildId: string };
}>;

const UUID_SCHEMA = { type: "string", format: "uuid" } as const;

/**
 * The route's params and body. Unknown body keys are refused through
 * `propertyNames`, since Fastify's default `removeAdditional` would quietly
 * drop them under `additionalProperties: false`.
 */
const BUILD_ROUTE_SCHEMA = {
  params: {
    type: "object",
    required: ["catalogListingId"],
    properties: { catalogListingId: UUID_SCHEMA },
  },
  body: {
    type: "object",
    required: ["buildId"],
    properties: { buildId: UUID_SCHEMA },
    propertyNames: { enum: ["buildId"] },
  },
} as const;

async function _requestBuild(
  request: BuildRequest,
  reply: FastifyReply,
  enqueueBuild: (build: ParquetCopyBuildRequest) => boolean,
): Promise<FastifyReply> {
  if (request.validationError) {
    return await reply.status(400).send({
      ok: false,
      error: `A build takes a listing UUID and a body of { buildId }. ${request.validationError.message}`,
    });
  }
  let supabase: PipelineSupabaseTarget;
  try {
    supabase = readSupabaseTarget(request.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid target.";
    return await reply.status(400).send({ ok: false, error: message });
  }
  const isQueued = enqueueBuild({
    catalogListingId: request.params.catalogListingId,
    buildId: request.body.buildId,
    supabase,
  });
  return await reply.status(202).send({ ok: true, isQueued });
}

/**
 * Creates `POST /open-data-cache/:catalogListingId/build`, which queues a
 * build of a catalog listing's Parquet copy and answers 202 straight away.
 * The body carries the build id the caller claimed for the listing
 * (`rpc_data_catalog_listings__request_parquet_cache`), and the headers name
 * the Supabase project the listing lives in, as for a pipeline run.
 * `isQueued` is false when the same build is already queued or running.
 *
 * Auth is checked before anything else, so an unauthenticated caller gets
 * 401 whatever it sends. A listing id or build id that is not a UUID, an
 * unknown body key, or a missing Supabase project answers 400.
 *
 * @param deps.enqueueBuild - Queues a build, returning false when it is
 *   already queued or running.
 */
export function createOpenDataCacheRoutes(deps: {
  enqueueBuild: (build: ParquetCopyBuildRequest) => boolean;
}): FastifyPluginAsync {
  return async (server) => {
    server.post(
      "/open-data-cache/:catalogListingId/build",
      {
        schema: BUILD_ROUTE_SCHEMA,
        attachValidation: true,
        preValidation: async (request, reply) => {
          return await requireServerAuth({ request, reply });
        },
      },
      async (request, reply) => {
        return await _requestBuild(
          request as BuildRequest,
          reply,
          deps.enqueueBuild,
        );
      },
    );
  };
}
