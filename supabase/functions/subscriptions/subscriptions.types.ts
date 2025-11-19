import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { AvaPolarProduct } from "../_shared/PolarClient/PolarClient.types.ts";
import type { Tables } from "../../../src/types/database.types.ts";

export type SubscriptionsAPI = APITypeDef<
  "subscriptions",
  ["/:subscriptionId/product", "/products", "/checkout-url/:productId"],
  {
    "/:subscriptionId/product": {
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

    "/products": {
      GET: {
        returnType: {
          products: AvaPolarProduct[];
        };
      };
    };

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
