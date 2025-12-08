import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

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
