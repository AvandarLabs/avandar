import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import type { HealthzAPI } from "@sbfn/healthz/healthz.types.ts";

/**
 * This is the route handler for all healthz endpoints.
 */
export const Routes = defineRoutes<HealthzAPI>("healthz", {
  "/": {
    GET: GET("/")
      .disableJWTVerification()
      .action(() => {
        return { status: "ok" };
      }),
  },
});
