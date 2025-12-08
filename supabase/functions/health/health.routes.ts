import { defineRoutes, GET } from "../_shared/MiniServer/MiniServer.ts";
import type { HealthAPI } from "./health.types.ts";

/**
 * This is the route handler for all health endpoints.
 */
export const Routes = defineRoutes<HealthAPI>("health", {
  "/": {
    GET: GET("/")
      .disableJWTVerification()
      .action(() => {
        return { status: "ok" };
      }),
  },
});
