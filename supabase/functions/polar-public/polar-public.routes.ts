import { Checkout } from "jsr:@polar-sh/deno";
import { array, string } from "zod";
import { defineRoutes, GET, POST } from "../_shared/MiniServer/MiniServer.ts";
import { getPolarAccessToken } from "../_shared/PolarClient/getPolarAccessToken.ts";
import { getPolarServerType } from "../_shared/PolarClient/getPolarServerType.ts";
import type { API } from "./polar-public.types.ts";

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
 * accessible (e.g. webhook events or external redirects). All actions in this
 * function must have JWT verification disabled.
 */
export const Routes = defineRoutes<API>({
  "polar-public": {
    /**
     * Creates a Polar checkout session and redirects to the external URL.
     * This is the first step in the checkout process.
     * This endpoint should not be accessed with `fetch()`, but rather should
     * be navigated to directly from the browser.
     * */
    "/checkout-redirect": GET("/checkout-redirect")
      .disableJWTVerification()
      .querySchema({
        // the product ID (i.e. the subscription plan) we are checking out
        // NOTE: do not change this param name. It is read automatically by
        // polar's `Checkout` function to determine which products are being
        // checked out
        products: string()
          .transform((value) => {
            return value.split(";");
          })
          .pipe(array(string().min(1))),

        // where we redirect after successful payment
        successURL: string(),
      })
      .action(async ({ request }) => {
        const checkoutFn = Checkout({
          accessToken: getPolarAccessToken(),
          successUrl: "https://avandarlabs.com",
          server: getPolarServerType(),
        });
        return await checkoutFn(request);
      }),

    /**
     * Handles all Polar webhook events.
     */
    "/webhook": POST("/webhook")
      // Disable JWT verification because this gets called by Polar (i.e. not
      // an authenticated call with Supabase)
      .disableJWTVerification()
      .action(async ({ request }) => {
        console.log("we made it", request);
        /*
        const body = await request.json();
        console.log(body);
        */
        return { success: true, message: "Webhook received" };
      }),
  },
});
