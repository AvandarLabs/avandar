import { defineRoutes, GET } from "../_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "../_shared/PolarClient/PolarClient.ts";
import type { BillingAPI } from "./billing.types.ts";

/**
 * This is the route handler for all billing-related endpoints.
 */
export const Routes = defineRoutes<BillingAPI>({
  billing: {
    /**
     * Returns the list of available plans.
     */
    "/plans": GET("/plans").action(async () => {
      const plans = await PolarClient.getSubscriptionPlans();
      return { plans };
    }),
  },
});
