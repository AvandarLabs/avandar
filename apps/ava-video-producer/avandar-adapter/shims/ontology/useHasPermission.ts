/** Film-only permission check. The ontology film shows a viewer, so every
 * role-gated action stays hidden, as it does for a user without the role.
 */
export function useHasPermission(_permissionKey: string): boolean {
  return false;
}
