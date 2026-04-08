import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type SupportAPI = APITypeDef<
  "support",
  ["/"],
  {
    "/": {
      GET: {
        returnType: {
          success: boolean;
        };
      };
    };
  }
>;
