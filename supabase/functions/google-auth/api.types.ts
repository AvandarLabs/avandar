import type { DBGoogleToken } from "../_shared/types/models.types.ts";

export type API = {
  "google-auth": {
    "/auth-url": {
      returnType: {
        authorizeURL: string;
      };
    };

    "/tokens": {
      returnType: {
        tokens: DBGoogleToken[];
      };
    };
  };
};
