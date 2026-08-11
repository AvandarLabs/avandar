import type { Module } from "@avandar/modules";
import type { EmptyObject, UnknownObject } from "@avandar/utils";

/**
 * The base module type for a client that is used to access a service.
 */
export type ServiceClient<ClientName extends string = string> = Module<
  ClientName,
  UnknownObject | EmptyObject,
  {
    /**
     * Returns the client name, e.g., "UserClient".
     *
     * This is an alias for `getModuleName` from the `BaseModule` type.
     */
    getClientName(): ClientName;
  }
>;
