import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type API = APITypeDef<{
  "polar-public": {
    "/webhook": {
      returnType: {
        success: boolean;
        message?: string;
      };
    };
    "/checkout-redirect": {
      returnType: Response;
    };
  };
}>;
