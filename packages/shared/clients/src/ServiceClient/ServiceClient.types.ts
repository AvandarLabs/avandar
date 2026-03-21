import type { Module } from "@modules/createModule.ts";
import type { EmptyObject } from "@utils/types/common.types.ts";

/**
 * The base module type for a client that is used to access a service.
 */
export type ServiceClient<ClientName extends string = string> = Module<
  ClientName,
  EmptyObject,
  {
    /**
     * Returns the client name, e.g., "UserClient".
     *
     * This is an alias for `getModuleName` from the `BaseModule` type.
     */
    getClientName(): ClientName;
  }
>;
