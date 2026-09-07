import { NgrokDevUrlsManager } from "@fanout-server/NgrokDevUrlsManager";
import z from "zod";
import type { NgrokDevUrlTarget } from "@fanout-server/NgrokDevUrlsManager";
import type { FastifyReply, FastifyRequest } from "fastify";

const AddBodySchema = z.object({
  url: z.url(),
});

const RemoveBodySchema = z.object({
  url: z.url(),
});

function _getAdminSecret(): string | undefined {
  const rawToken: string | undefined =
    process.env.AVA_DEV_FANOUT_ADMIN_SERVER_SECRET;
  return rawToken?.trim();
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

function _stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function _requireAdminAuth(options: {
  request: FastifyRequest;
  reply: FastifyReply;
}): Promise<FastifyReply | undefined> {
  const expectedToken: string | undefined = _getAdminSecret();
  if (!expectedToken) {
    return await options.reply.status(500).send({
      ok: false,
      error: "Server is missing AVA_DEV_FANOUT_ADMIN_SERVER_SECRET.",
    });
  }

  const actualToken: string | undefined = _getBearerToken(
    options.request.headers.authorization,
  );
  if (actualToken !== expectedToken) {
    return await options.reply.status(401).send({
      ok: false,
      error: "Unauthorized.",
    });
  }

  return undefined;
}

export async function onListNgrokUrls(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const authError = await _requireAdminAuth({ request, reply });
  if (authError) {
    return authError;
  }

  const targets: readonly NgrokDevUrlTarget[] =
    await NgrokDevUrlsManager.readNgrokDevUrls();
  return await reply.send({
    targets,
  });
}

export async function onAddNgrokUrl(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  try {
    const body = AddBodySchema.parse(request.body);
    const normalizedURL: string = _stripTrailingSlash(body.url);
    const targets: readonly NgrokDevUrlTarget[] =
      await NgrokDevUrlsManager.readNgrokDevUrls();

    const existing: NgrokDevUrlTarget | undefined = targets.find((target) => {
      return target.url === normalizedURL;
    });

    if (existing) {
      // return an http 409 Conflict error
      return await reply.status(409).send({
        ok: false,
        error: "URL already exists.",
        targets,
      });
    }

    const newTarget: NgrokDevUrlTarget = {
      url: normalizedURL,
      dateAdded: new Date().toISOString(),
      lastAccessedDate: null,
    };
    const updatedTargets: readonly NgrokDevUrlTarget[] = [
      ...targets,
      newTarget,
    ];
    await NgrokDevUrlsManager.writeNgrokDevUrls({ targets: updatedTargets });
    return await reply.send({ targets: [newTarget] });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return await reply.status(400).send({
        ok: false,
        error: error.issues,
      });
    }

    const message: string =
      error instanceof Error ? error.message : "Unknown error";
    return await reply.status(500).send({
      ok: false,
      error: message,
    });
  }
}

export async function onRemoveNgrokUrl(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const authError = await _requireAdminAuth({ request, reply });
  if (authError) {
    return authError;
  }

  try {
    const body = RemoveBodySchema.parse(request.body);
    const targets: readonly NgrokDevUrlTarget[] =
      await NgrokDevUrlsManager.readNgrokDevUrls();
    const updatedTargets: readonly NgrokDevUrlTarget[] = targets.filter(
      (target) => {
        return target.url !== body.url;
      },
    );

    if (updatedTargets.length === targets.length) {
      return await reply.status(404).send({
        ok: false,
        error: "URL not found.",
        targets,
      });
    }

    await NgrokDevUrlsManager.writeNgrokDevUrls({ targets: updatedTargets });
    return await reply.send({ targets: updatedTargets });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return await reply.status(400).send({
        ok: false,
        error: error.issues,
      });
    }

    const message: string =
      error instanceof Error ? error.message : "Unknown error";
    return await reply.status(500).send({
      ok: false,
      error: message,
    });
  }
}
