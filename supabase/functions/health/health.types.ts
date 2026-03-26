import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type HealthAPI = APITypeDef<
  "health",
  ["/"],
  {
    "/": {
      GET: {
        returnType: {
          status: "ok";
        };
      };
    };
  }
>;
