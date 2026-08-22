import type { User } from "$/models/User/User.ts";
import type {
  AvaPolarProduct,
  SubscriptionsAPI,
} from "@sbfn/subscriptions/SubscriptionsRoutes.types.ts";

import { assertIsNonNullish } from "@avandar/utils";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import { UpdateSubscriptionProduct } from "@sbfn/subscriptions/[subscriptionId].product.ts";
import { UpdateSubscriptionSeats } from "@sbfn/subscriptions/[subscriptionId].seats.ts";
import { CreateFreeSubscription } from "@sbfn/subscriptions/create-free.ts";
import { FetchAndSyncUserSubscriptions } from "@sbfn/subscriptions/fetch-and-sync.ts";
import { hasSubscriptionPermission } from "@sbfn/subscriptions/services/hasSubscriptionPermission.ts";
import { match } from "ts-pattern";
import { z } from "zod";

import { getDevOverrideEmail } from "$/env/getDevOverrideEmail.ts";
import { Subscription } from "$/models/Subscription/Subscription.ts";

/**
 * This is the route handler for all billing-related endpoints.
 */
export const SubscriptionsRoutes = defineRoutes<SubscriptionsAPI>(
  "subscriptions",
  {
    "/fetch-and-sync": {
      GET: FetchAndSyncUserSubscriptions,
    },

    "/create-free": {
      POST: CreateFreeSubscription,
    },

    "/:subscriptionId/product": {
      PATCH: UpdateSubscriptionProduct,
    },

    "/:subscriptionId/seats": {
      PATCH: UpdateSubscriptionSeats,
    },

    /**
     * Returns the list of available and active products (plans) you can
     * subscribe to. Right now, that's the list of all available Polar products.
     *
     * TODO(jpsyx): we should store this response in our Supabase db so that
     * we dont have to hit the Polar API every time, which is slower.
     */
    "/products": {
      GET: GET("/products").action(async () => {
        const polarProducts = await PolarClient.getProducts();
        const simplifiedProducts: AvaPolarProduct[] = polarProducts
          .map((product) => {
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
          })
          .filter((product) => {
            return !product.isArchived;
          });
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
          productId: z.string(),
        },
      })
        .querySchema({
          userId: z.string(),
          workspaceId: z.string(),
          returnURL: z.string(),
          successURL: z.string(),
          checkoutEmail: z.string(),
          currentPolarSubscriptionId: z.string().optional(),
          currentCustomerId: z.string().optional(),
          numSeats: z
            .string()
            .optional()
            .transform((val) => {
              return val ? Number(val) : undefined;
            }),
        })
        .action(async ({ pathParams, queryParams, user }) => {
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

          if (userId !== user.id) {
            throw new AvaHTTPError(
              "Cannot create a checkout session for another user.",
              FORBIDDEN,
            );
          }

          // In dev, use a Polar-acceptable email (e.g. delivered@resend.dev)
          // since Polar rejects test domains like test@test.com
          const devOverride = getDevOverrideEmail();
          const emailForPolar =
            Deno.env.get("MODE") === "development" && devOverride
              ? devOverride
              : checkoutEmail;

          const checkout = await PolarClient.createCheckoutSession({
            avandarMetadata: {
              userId,
              workspaceId,
            },
            productId,
            returnURL,
            successURL,
            numSeats,
            checkoutEmail: emailForPolar,
            currentCustomerId,
            currentSubscriptionId: currentPolarSubscriptionId ?? undefined,
          });
          return { checkoutURL: checkout.url };
        }),
    },

    "/customer-portal/:userId": {
      GET: GET({
        path: "/customer-portal/:userId",
        schema: { userId: z.uuid() },
      })
        .querySchema({
          returnURL: z.url(),
        })
        .action(
          async ({ pathParams, queryParams, supabaseAdminClient, user }) => {
            if (pathParams.userId !== user.id) {
              throw new AvaHTTPError(
                "Cannot open the billing portal for another user.",
                FORBIDDEN,
              );
            }

            // first check if the user has a subscription
            const { data: subscriptions } = await supabaseAdminClient
              .from("subscriptions")
              .select("polar_subscription_id, polar_customer_id")
              .eq("subscription_owner_id", pathParams.userId);
            if (!subscriptions || subscriptions.length === 0) {
              return { success: false };
            }

            const subscriptionWithPolarCustomer = subscriptions.find(
              (subscriptionRow) => {
                return subscriptionRow.polar_customer_id != null;
              },
            );

            if (subscriptionWithPolarCustomer === undefined) {
              return { success: false };
            }

            assertIsNonNullish(
              subscriptionWithPolarCustomer.polar_customer_id,
              "Subscription with Polar customer ID is required",
            );

            const customerSession = await PolarClient.createCustomerSessions({
              customerId: subscriptionWithPolarCustomer.polar_customer_id,
              returnURL: queryParams.returnURL,
            });
            return {
              success: true,
              customerPortalURL: customerSession.customerPortalUrl,
            };
          },
        ),
    },

    "/:subscriptionId/permissions/:permissionType": {
      GET: GET({
        path: "/:subscriptionId/permissions/:permissionType",
        schema: {
          subscriptionId: z.uuid(),
          permissionType: z.enum(Subscription.Permissions),
        },
      }).action(
        async ({
          pathParams: { subscriptionId, permissionType },
          supabaseAdminClient,
          user,
        }) => {
          return {
            allowed: await hasSubscriptionPermission({
              subscriptionId: subscriptionId as
                | Subscription.PolarId
                | Subscription.Id,
              permissionType,
              supabaseAdminClient,
              userId: user.id as User.Id,
            }),
          };
        },
      ),
    },
  },
);
