import type { APITypeDef } from "@sfn/_shared/MiniServer/api.types.ts";
import type { DBGoogleToken } from "@sfn/_shared/types/models.types.ts";

export type GoogleAuthAPI = APITypeDef<
  "google-auth",
  ["/auth-url", "/tokens"],
  {
    "/auth-url": {
      GET: {
        queryParams: {
          redirectURL: string;
        };
        returnType: {
          authorizeURL: string;
        };
      };
    };

    "/tokens": {
      GET: {
        returnType: {
          tokens: DBGoogleToken[];
        };
      };
    };
  }
>;
