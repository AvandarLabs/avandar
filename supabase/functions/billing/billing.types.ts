import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { Product } from "../_shared/PolarClient/Polar.types.ts";

export type BillingAPI = APITypeDef<{
  billing: {
    "/plans": {
      returnType: {
        plans: Product[];
      };
    };
  };
}>;
