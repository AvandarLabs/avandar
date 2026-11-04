import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import type { Connector, ConnectorType } from "@sbfn/connectors/Connector.ts";

/**
 * The one registry every route dispatches through - the same registry shape
 * `createDefaultRegistry.ts` uses for `SourceWrapper`s, applied one layer
 * down at the HTTP boundary. Adding a connector after `postgres` means a new
 * entry here, never a new edge function.
 */
export const CONNECTORS: Record<ConnectorType, Connector> = {
  postgres: createPostgresConnector(),
};

/** Looks up a connector by type; throws if the type is unrecognized. */
export function getConnector(connectorType: string): Connector {
  const connector = CONNECTORS[connectorType as ConnectorType];
  if (!connector) {
    throw new Error(`Unknown connector type: '${connectorType}'`);
  }
  return connector;
}
