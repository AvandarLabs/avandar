import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import type { HealthzAPI } from "@sbfn/healthz/HealthzRoutes.types.ts";

/**
 * This is the route handler for all healthz endpoints.
 */
export const HealthzRoutes = defineRoutes<HealthzAPI>("healthz", {
  "/": {
    GET: GET("/")
      .disableJWTVerification()
      .action(() => {
        return { status: "ok" };
      }),
  },
});
