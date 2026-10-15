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
        // CSV text, returned as a raw Response (text/csv) - not JSON, so the
        // wrapper transcodes it client-side exactly like Google Sheets does
        // (spec section 5.4's route table). An error still comes back as
        // the plain `ExternalDatasetErrorResponse` object, same as every
        // other route.
        returnType: Response | ExternalDatasetErrorResponse;
      };
    };
  }
>;
