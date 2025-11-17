import { email, string, url, uuid } from "zod";
import { defineRoutes, GET } from "../_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "../_shared/PolarClient/PolarClient.ts";
import type { BillingAPI } from "./billing.types.ts";

/**
 * This is the route handler for all billing-related endpoints.
 */
export const Routes = defineRoutes<BillingAPI>("billing", {
  /**
   * Returns the list of available plans. Right now, that's the
   * list of all available Polar products.
   *
   * TODO(jpsyx): we should store this response in our Supabase db so that
   * we dont have to hit the Polar API every time, which is slower.
   */
  "/plans": {
    GET: GET("/plans").action(async () => {
      const plans = await PolarClient.getProducts();
      return { plans };
    }),
  },

  /**
   * Creates a checkout URL for a single Polar product.
   * This is called when a user selects a plan to subscribe to.
   */
  "/checkout-url/:productId": {
    GET: GET({
      path: "/checkout-url/:productId",
      schema: {
        productId: string(),
      },
    })
      .querySchema({
        userId: uuid(),
        workspaceId: uuid(),
        returnURL: url(),
        successURL: url(),
        userEmail: email(),
        numSeats: string()
          .optional()
          .transform((val) => {
            return val ? Number(val) : undefined;
          }),
      })
      .action(async ({ pathParams, queryParams }) => {
        const { productId } = pathParams;
        const {
          returnURL,
          successURL,
          userEmail,
          userId,
          workspaceId,
          numSeats,
        } = queryParams;
        const checkout = await PolarClient.createCheckoutSession({
          avandarMetadata: {
            userId,
            workspaceId,
          },
          productId,
          returnURL,
          successURL,
          numSeats,
          userEmail,
        });
        return { checkoutURL: checkout.url };
      }),
  },
});
