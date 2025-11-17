import { defineRoutes, POST } from "../_shared/MiniServer/MiniServer.ts";
import type { PolarPublicAPI } from "./polar-public.types.ts";

type PolarSubscription = {
  id: string;
  status: string;
  customer: {
    id: string;
    email?: string;
  };
};

type PolarWebhookEvent = {
  type: "subscription.created" | "subscription.updated";
  data: PolarSubscription;
};

/**
 * This is the route handler for all Polar endpoints that must be publicly
 * accessible (e.g. webhook events). All actions in this
 * function must have JWT verification disabled.
 */
export const Routes = defineRoutes<PolarPublicAPI>("polar-public", {
  /**
   * Handles all Polar webhook events.
   */
  "/webhook": {
    POST: POST("/webhook")
      .disableJWTVerification()
      .action(() => {
        return { success: true, message: "Webhook received" };
      }),
  },
});
