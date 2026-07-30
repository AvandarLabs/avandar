import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type GoogleAuthCallbackAPI = APITypeDef<
  "google-auth-callback",
  ["/"],
  {
    "/": {
      GET: {
        queryParams: {
          state: string;
          code: string;
        };
        returnType: void;
      };
    };
  }
>;
