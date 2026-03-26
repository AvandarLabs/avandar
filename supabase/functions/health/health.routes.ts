import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import type { HealthAPI } from "@sbfn/health/health.types.ts";

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
