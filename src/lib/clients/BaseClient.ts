/**
 * This is the base client type that all clients must implement.
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
