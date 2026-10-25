import { createPostgresConnector } from "@sbfn/connectors/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import type {
  ExternalDatasetConnector,
  ExternalDatasetConnectorType,
} from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";

/**
 * The one registry every route dispatches through - the same registry shape
 * `createDefaultRegistry.ts` uses for `SourceWrapper`s, applied one layer
 * down at the HTTP boundary. Adding a connector after `postgres` means a new
 * entry here, never a new edge function.
 */
export const CONNECTORS: Record<
  ExternalDatasetConnectorType,
  ExternalDatasetConnector
> = {
  postgres: createPostgresConnector(),
};

/** Looks up a connector by type; throws if the type is unrecognized. */
export function getConnector(connectorType: string): ExternalDatasetConnector {
  const connector = CONNECTORS[connectorType as ExternalDatasetConnectorType];
  if (!connector) {
    throw new Error(`Unknown connector type: '${connectorType}'`);
  }
  return connector;
}
