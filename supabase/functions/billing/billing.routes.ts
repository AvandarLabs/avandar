import { email, string, url } from "zod";
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
   */
  "/plans": {
    GET: GET("/plans").action(async () => {
      const plans = await PolarClient.getProducts();
      return { plans };
    }),
  },

  "/checkout-url/:productId": {
    GET: GET({
      path: "/checkout-url/:productId",
      schema: {
        productId: string(),
      },
    })
      .querySchema({
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
        const { returnURL, successURL, userEmail, numSeats } = queryParams;
        const checkout = await PolarClient.createCheckoutSession({
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
