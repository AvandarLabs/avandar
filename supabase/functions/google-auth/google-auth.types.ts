import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { DBGoogleToken } from "../_shared/types/models.types.ts";

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
