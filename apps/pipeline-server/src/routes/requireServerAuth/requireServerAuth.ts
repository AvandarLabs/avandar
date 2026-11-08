import type { FastifyReply, FastifyRequest } from "fastify";

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

/**
 * Answers 500 when the server has no `AVA_PIPELINE_SERVER_SECRET`, and 401
 * when the request's bearer token is not it. Returns the reply it sent, or
 * `undefined` when the request may go on. Use it as a route's
 * `preValidation`, so an unauthenticated caller gets 401 whatever it sends.
 */
export async function requireServerAuth(options: {
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
