import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { AvaPolarProduct } from "../_shared/PolarClient/PolarClient.types.ts";

export type BillingAPI = APITypeDef<
  "billing",
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
          userEmail: string;
          numSeats?: number;
        };
        returnType: {
          checkoutURL: string;
        };
      };
    };
  }
>;
