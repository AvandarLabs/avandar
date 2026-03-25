import {
  onAddNgrokURL,
  onListNgrokURLs,
  onRemoveNgrokURL,
} from "@fanout-server/routes/ngrok-url/ngrok-url";
import { FastifyPluginAsync } from "fastify";

/** Register endpoints to manage persisted ngrok dev URLs. */
export const registerNgrokURLRoutes: FastifyPluginAsync = async (server) => {
  server.post("/ngrok-url/remove", onRemoveNgrokURL);
  server.get("/ngrok-url/list", onListNgrokURLs);
  server.post("/ngrok-url/add", onAddNgrokURL);
};
