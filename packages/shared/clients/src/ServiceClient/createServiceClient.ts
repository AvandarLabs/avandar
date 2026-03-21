import { createModule } from "@modules/createModule.ts";
import { ServiceClient } from "./ServiceClient.types.ts";

/**
 * Creates a base service client module with a `getClientName` function.
 *
 * @param clientName - The name of the service client. By convention,
 * this should end in "Client".
 * @returns The base client module.
 */
export function createServiceClient<ClientName extends string>(
  clientName: ClientName,
): ServiceClient<ClientName> {
  return createModule(clientName, {
    builder: (module) => {
      return {
        getClientName: () => {
          return module.getModuleName();
        },
      };
    },
  });
}
