import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { AvaPolarProduct } from "../_shared/PolarClient/PolarClient.types.ts";

export type SubscriptionsAPI = APITypeDef<
  "subscriptions",
  ["/plans", "/checkout-url/:productId"],
  {
    "/plans": {
      GET: {
        returnType: {
          plans: AvaPolarProduct[];
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
          checkoutEmail: string;
          userId: string;
          workspaceId: string;

          /**
           * Number of seats to purchase in the checkout. This is require
           * if the product being checked out has seat-based pricing.
           */
          numSeats?: number;

          /**
           * The ID of the current customer in Polar (if they already exist)
           * to make sure we link the checkout to the same customer in Polar.
           */
          currentCustomerId?: string | undefined;

          /**
           * The ID of the current subscription if we are upgrading from a free
           * plan to a paid plan.
           */
          currentSubscriptionId?: string | undefined;
        };
        returnType: {
          checkoutURL: string;
        };
      };
    };
  }
>;
