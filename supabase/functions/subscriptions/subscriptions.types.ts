import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { Tables } from "../../../src/types/database.types.ts";

/**
 * A subset of the Polar Product type that is served to the frontend.
 */
export type AvaPolarProduct = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  recurringInterval: "day" | "week" | "month" | "year" | null;
  metadata: Record<string, string | number | boolean>;
  prices: Array<
    {
      id: string;
      isArchived: boolean;
    } & (
      | {
          amountType: "free";
        }
      | {
          amountType: "custom";
          priceCurrency: string;
        }
      | {
          amountType: "seat_based";
          priceCurrency: string;
          seatTiers: Array<{
            pricePerSeat: number;
          }>;
        }
    )
  >;
};
export type SubscriptionsAPI = APITypeDef<
  "subscriptions",
  [
    "/fetch-and-sync",
    "/:subscriptionId/product",
    "/products",
    "/checkout-url/:productId",
    "/customer-portal/:userId",
  ],
  {
    /**
     * Search for subscriptions by a user's Avandar ID and udpate them in our
     * Supabase database in case anything has changed in Polar.
     */
    "/fetch-and-sync": {
      GET: {
        queryParams: {
          /** The Avandar ID of the user to look up subscriptions for. */
          userId: string;
        };
        returnType: {
          subscriptions: Array<Tables<"subscriptions">>;
        };
      };
    };

    "/:subscriptionId/product": {
      /** Update a subscription to subscribe to a different product. */
      PATCH: {
        pathParams: {
          subscriptionId: string;
        };
        body: {
          newPolarProductId: string;
        };
        returnType: {
          subscription: Tables<"subscriptions">;
        };
      };
    };

    /** Get the list of available products (plans) you can subscribe to. */
    "/products": {
      GET: {
        returnType: {
          products: AvaPolarProduct[];
        };
      };
    };

    /** Create a checkout URL for a single product. */
    "/checkout-url/:productId": {
      GET: {
        pathParams: {
          productId: string;
        };
        queryParams: {
          returnURL: string;
          successURL: string;

          /**
           * The email to use in the checkout. This is editable by the user in
           * the checkout page, unless we specified a `currentCustomerId`, in
           * which case the email will be pre-filled with their email info
           * from Polar and is not editable.
           */
          checkoutEmail: string;

          /**
           * The Avandar User ID. This will be stored in Polar as the user's
           * external customer ID.
           */
          userId: string;

          /**
           * The Avandar Workspace ID. This will be stored in Polar in the
           * subscription's metadata.
           */
          workspaceId: string;

          /**
           * Number of seats to purchase in the checkout. This is required
           * if the product being checked out has seat-based pricing.
           *
           * The user can edit this in the checkout page, but we still need
           * to supply an initial number.
           */
          numSeats?: number;

          /**
           * The ID of the current customer in Polar (if they already exist)
           * to make sure we link the checkout to the same customer in Polar.
           */
          currentCustomerId?: string | undefined;

          /**
           * The ID of the current Polar subscription if we are upgrading from
           * a free plan to a paid plan.
           */
          currentPolarSubscriptionId?: string | undefined;
        };
        returnType: {
          checkoutURL: string;
        };
      };
    };

    /**
     * Create a customer portal URL for a user so they can manage their
     * subscriptions in Polar.
     */
    "/customer-portal/:userId": {
      GET: {
        pathParams: {
          userId: string;
        };
        queryParams: {
          returnURL: string;
        };
        returnType:
          | {
              success: false;
            }
          | {
              success: true;
              customerPortalURL: string;
            };
      };
    };
  }
>;
