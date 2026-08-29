import {
  onAddNgrokUrl,
  onListNgrokUrls,
  onRemoveNgrokUrl,
} from "@fanout-server/routes/ngrok-url/ngrok-url";
import { FastifyPluginAsync } from "fastify";

/** Register endpoints to manage persisted ngrok dev URLs. */
export const registerNgrokUrlRoutes: FastifyPluginAsync = async (server) => {
  server.post("/ngrok-url/remove", onRemoveNgrokUrl);
  server.get("/ngrok-url/list", onListNgrokUrls);
  server.post("/ngrok-url/add", onAddNgrokUrl);
};
