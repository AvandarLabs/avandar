import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import type { HealthzAPI } from "@sbfn/healthz/HealthzRoutes.types.ts";

/**
 * Defines the health endpoint returning an ok status.
 * Used by `MiniServer` to serve health checks.
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
