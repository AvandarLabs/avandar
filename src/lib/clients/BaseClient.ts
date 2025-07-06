/**
 * This is the base client type that all clients must implement.
 *
 * TODO(jpsyx): an improved version of this type should take in Options
 * as a generic and have a `create` function that returns a new instance of
 * the client. This way we can enforce certain clients to have certain state.
 */
export type BaseClient = {
  /**
   * Returns the name of the client.
   * Used for logging purposes.
   */
  getClientName(): string;
};

export function createBaseClient(clientPrefix: string): BaseClient {
  return {
    getClientName(): string {
      return `${clientPrefix}Client`;
    },
  };
}
