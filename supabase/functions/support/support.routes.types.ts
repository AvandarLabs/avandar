import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type SupportAPI = APITypeDef<
  "support",
  ["/featurebase-jwt"],
  {
    "/featurebase-jwt": {
      GET: {
        returnType: {
          featurebaseJWT: string;
        };
      };
    };
  }
>;
