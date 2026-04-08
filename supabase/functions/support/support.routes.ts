import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import type { SupportAPI } from "@sbfn/support/support.routes.types.ts";

/**
 * This is the route handler for all support endpoints.
 */
export const Routes = defineRoutes<SupportAPI>("support", {
  "/": {
    GET: GET("/").action(() => {
      return { success: true };
    }),
  },
});
