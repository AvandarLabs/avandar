import type { UnknownObject } from "@avandar/utils";

/**
 * A mixin that adds `newMembers` and reads nothing from the module.
 *
 * @param newMembers - The members to add.
 * @returns The mixin.
 */
export function withNewMembers<NewMembers extends UnknownObject>(
  newMembers: NewMembers,
): () => { members: NewMembers } {
  return () => {
    return { members: newMembers };
  };
}
