import type { UnknownObject } from "@avandar/utils";

/**
 * A mixin to add new members to a module.
 *
 * @param newMembers - The new members to add to the module.
 * @returns A function that returns the new members.
 */
export function withNewMembers<T extends UnknownObject>(
  newMembers: T,
): () => { members: T } {
  return () => {
    return { members: newMembers };
  };
}
