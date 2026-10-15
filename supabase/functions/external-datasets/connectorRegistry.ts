import { createPostgresConnector } from "@sbfn/external-datasets/connectors/postgres/createPostgresConnector.ts";
import type {
  ExternalDatasetConnector,
  ExternalDatasetConnectorType,
} from "@sbfn/external-datasets/connectors/ExternalDatasetConnector.ts";

/**
 * The one registry every route dispatches through (spec section 5.4) - the
 * same registry shape `createDefaultRegistry.ts` uses for `SourceWrapper`s,
 * applied one layer down at the HTTP boundary. Adding a connector after
 * `postgres` means a new entry here, never a new edge function.
 */
export const CONNECTORS: Record<
  ExternalDatasetConnectorType,
  ExternalDatasetConnector
> = {
  postgres: createPostgresConnector(),
};

export function getConnector(
  connectorType: string,
): ExternalDatasetConnector {
  const connector = CONNECTORS[connectorType as ExternalDatasetConnectorType];
  if (!connector) {
    throw new Error(`Unknown connector type: '${connectorType}'`);
  }
  return connector;
}
