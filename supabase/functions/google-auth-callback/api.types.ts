import { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type API = APITypeDef<{
  "google-auth-callback": {
    "/": {
      returnType: void;
    };
  };
}>;
