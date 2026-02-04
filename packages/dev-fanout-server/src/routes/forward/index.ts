import { FastifyPluginAsync } from "fastify";
import { onFanoutRequest } from "./forward";

/**
 * Registers a catch-all `/forward` route that fans out requests to dev URLs.
 *
 * This allows us to use webhooks in external services during local development.
 *
 * Explanation:
 *
 * External services require webhooks to be configured with a stable URL.
 * This server provides a stable endpoint that can receive webhooks from
 * external services and then forward them to our dev URLs which we obtain
 * through ngrok. This allows us to develop locally without having to change
 * the webhook URL in any external services.
 *
 * This endpoint will receives public requests from external services and
 * forward them to a list of configured target URLs in
 * `/data/ngrok-dev-urls.json` (backed by a Fly Volume).
 */
export const registerForwardRoute: FastifyPluginAsync = async (server) => {
  // Catch-all: match both `/forward` and any sub-path like `/forward/foo/bar`.
  server.all("/forward", onFanoutRequest);
  server.all("/forward/*", onFanoutRequest);
};
