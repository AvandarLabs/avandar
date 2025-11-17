import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type PolarPublicAPI = APITypeDef<
  "polar-public",
  ["/webhook"],
  {
    "/webhook": {
      POST: {
        returnType: {
          success: boolean;
          message?: string;
        };
      };
    };
  }
>;
