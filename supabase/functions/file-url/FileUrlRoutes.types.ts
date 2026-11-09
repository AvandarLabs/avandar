import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/** Downloads a public file link for the upload page. */
export type FileUrlAPI = APITypeDef<
  "file-url",
  ["/acquire"],
  {
    "/acquire": {
      POST: {
        body: {
          url: string;
          memberPath?: string;
        };
        returnType: Response;
      };
    };
  }
>;
