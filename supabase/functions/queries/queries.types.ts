import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type QueriesAPI = APITypeDef<
  "queries",
  ["/:workspaceId/generate"],
  {
    "/:workspaceId/generate": {
      GET: {
        pathParams: {
          workspaceId: string;
        };
        queryParams: {
          prompt: string;
        };
        returnType: {
          sql: string;
        };
      };
    };
  }
>;
