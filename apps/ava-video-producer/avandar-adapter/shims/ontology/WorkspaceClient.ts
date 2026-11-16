/** Film-only workspace client for CaseTypeRail. The ontology fixtures name no
 * workspace members, so the rail omits the owner fact, as the product does
 * when the owner is not among the members. No backend is contacted.
 */
export const WorkspaceClient = {
  useGetUsersForWorkspace: (_params: {
    workspaceId: string;
  }): readonly [readonly never[], false] => {
    return [[], false];
  },
};
