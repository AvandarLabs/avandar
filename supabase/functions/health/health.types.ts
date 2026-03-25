import type { APITypeDef } from "@sfn/_shared/MiniServer/api.types.ts";

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
