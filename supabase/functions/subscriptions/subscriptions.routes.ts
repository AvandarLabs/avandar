import { match } from "ts-pattern";
import { email, string, url, uuid } from "zod";
import { defineRoutes, GET } from "../_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "../_shared/PolarClient/PolarClient.ts";
import { UpdateSubscriptionProduct } from "./[subscriptionId].product.ts";
import { FetchAndSyncUserSubscriptions } from "./fetch-and-sync.ts";
import type {
  AvaPolarProduct,
  SubscriptionsAPI,
} from "./subscriptions.types.ts";

/**
 * This is the route handler for all billing-related endpoints.
 */
export const Routes = defineRoutes<SubscriptionsAPI>("subscriptions", {
  "/fetch-and-sync": {
    GET: FetchAndSyncUserSubscriptions,
  },

  "/:subscriptionId/product": {
    PATCH: UpdateSubscriptionProduct,
  },

  /**
   * Returns the list of available products (plans)you can subscribe to.
   * Right now, that's the list of all available Polar products.
   *
   * TODO(jpsyx): we should store this response in our Supabase db so that
   * we dont have to hit the Polar API every time, which is slower.
   */
  "/products": {
    GET: GET("/products").action(async () => {
      const polarProducts = await PolarClient.getProducts();
      const simplifiedProducts: AvaPolarProduct[] = polarProducts.map(
        (product) => {
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            isArchived: product.isArchived,
            recurringInterval: product.recurringInterval,
            metadata: product.metadata,
            prices: product.prices
              .map((price) => {
                const { id, isArchived } = price;
                return match(price)
                  .with({ amountType: "free" }, (p) => {
                    return {
                      id,
                      isArchived,
                      amountType: p.amountType,
                    };
                  })
                  .with({ amountType: "custom" }, (p) => {
                    return {
                      id,
                      isArchived,
                      amountType: p.amountType,
                      priceCurrency: p.priceCurrency,
                    };
                  })
                  .with({ amountType: "seat_based" }, (p) => {
                    return {
                      id,
                      isArchived,
                      amountType: p.amountType,
                      priceCurrency: p.priceCurrency,
                      seatTiers: p.seatTiers.tiers,
                    };
                  })
                  .otherwise(() => {
                    // we ignore all other price types for now. We do not want
                    // to show them in the app
                    return undefined;
                  });
              })
              .filter((price): price is NonNullable<typeof price> => {
                return price !== undefined;
              }),
          };
        },
      );
      return { products: simplifiedProducts };
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
        checkoutEmail: email(),
        currentPolarSubscriptionId: string().optional(),
        currentCustomerId: string().optional(),
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
          checkoutEmail,
          userId,
          workspaceId,
          numSeats,
          currentPolarSubscriptionId,
          currentCustomerId,
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
          checkoutEmail,
          currentCustomerId,
          currentSubscriptionId: currentPolarSubscriptionId ?? undefined,
        });
        return { checkoutURL: checkout.url };
      }),
  },

  "/customer-portal/:userId": {
    GET: GET({ path: "/customer-portal/:userId", schema: { userId: uuid() } })
      .querySchema({
        returnURL: url(),
      })
      .action(async ({ pathParams, queryParams, supabaseAdminClient }) => {
        // first check if the user has a subscription
        const { data: subscriptions } = await supabaseAdminClient
          .from("subscriptions")
          .select("polar_subscription_id")
          .eq("subscription_owner_id", pathParams.userId);
        if (!subscriptions || subscriptions.length === 0) {
          return { success: false };
        }

        // They have one, so we can create a customer session for them
        const customerSession = await PolarClient.createCustomerSessions({
          avandarUserId: pathParams.userId,
          returnURL: queryParams.returnURL,
        });
        return {
          success: true,
          customerPortalURL: customerSession.customerPortalUrl,
        };
      }),
  },
});
