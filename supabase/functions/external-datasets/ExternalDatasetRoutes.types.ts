import type {
  ExternalDatasetErrorCode,
  ExternalDatasetPreviewColumn,
  ExternalDatasetRelation,
} from "@sbfn/external-datasets/connectors/ExternalDatasetConnector.ts";
import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type ExternalDatasetErrorResponse = {
  error: { code: ExternalDatasetErrorCode; message: string };
};

export type ExternalDatasetsAPI = APITypeDef<
  "external-datasets",
  [
    "/:connectorType/connections/test-and-save",
    "/:connectorType/connections/:connectionId/relations",
    "/:connectorType/connections/:connectionId/relations/:relationId/preview",
    "/:connectorType/connections/:connectionId/relations/:relationId/rows",
  ],
  {
    "/:connectorType/connections/test-and-save": {
      POST: {
        pathParams: { connectorType: string };
        body: { workspaceId: string; connectionId?: string } & Record<
          string,
          unknown
        >;
        returnType:
          | { connectionId: string; relations: ExternalDatasetRelation[] }
          | ExternalDatasetErrorResponse;
      };
    };
    "/:connectorType/connections/:connectionId/relations": {
      GET: {
        pathParams: { connectorType: string; connectionId: string };
        returnType:
          | { relations: ExternalDatasetRelation[] }
          | ExternalDatasetErrorResponse;
      };
    };
    "/:connectorType/connections/:connectionId/relations/:relationId/preview": {
      GET: {
        pathParams: {
          connectorType: string;
          connectionId: string;
          relationId: string;
        };
        returnType:
          | {
              columns: ExternalDatasetPreviewColumn[];
              previewRows: Array<Record<string, unknown>>;
            }
          | ExternalDatasetErrorResponse;
      };
    };
    "/:connectorType/connections/:connectionId/relations/:relationId/rows": {
      GET: {
        pathParams: {
          connectorType: string;
          connectionId: string;
          relationId: string;
        };
        // The handler returns a raw `Response` with `Content-Type: text/csv`
        // - `ValidReturnType` (`MiniServer/api.types.ts`) only allows
        // `Record<string, unknown> | void | Response` here, so this must
        // stay `Response`, matching the one other route in this codebase
        // that also returns raw bytes (`open-data`'s
        // `/catalog-entries/:catalogEntryId/resource`, same `returnType:
        // Response`). That precedent is never called through
        // `APIClient`/`supabase.functions.invoke` for exactly this reason:
        // `functions.invoke`'s own content-type-based parsing resolves
        // `text/csv` to a plain string, not a `Response` object, so a caller
        // going through it could never get a real `Response` back no matter
        // what this type says. `acquirePostgresTableRelation.ts` instead
        // does its own authenticated `fetch`, mirroring
        // `fetchOpenDataCatalogResource.ts`, and reads the body itself. An
        // error response is still JSON (MiniServer's default wrapping), so
        // it comes back as the usual `ExternalDatasetErrorResponse` shape.
        returnType: Response | ExternalDatasetErrorResponse;
      };
    };
  }
>;
