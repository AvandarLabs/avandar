import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { UseQueryResult } from "@/lib/hooks/query/useQuery";
import { UserProfile } from "@/models/User/types";
import { UserClient } from "@/models/User/UserClient";

/**
 * Get the current user profile for the current workspace.
 *
 * NOTE: this function can only be used if we are within a route
 * that has a loaded workspace. Otherwise, we cannot get the user
 * profile because each user profile is linked to a workspace.
 *
 * If you are outside of a workspace, use `useAuth` instead to get
 * the authenticated DB user, but this will not give you any profile
 * data because a profile requires a workspace.
 *
 * @returns A tuple containing the user profile, a boolean indicating
 * if the data is loading, and the full `useQuery` response object.
 */
export function useCurrentUserProfile(): [
  userProfile: UserProfile | undefined,
  isLoading: boolean,
  response: UseQueryResult<UserProfile>,
] {
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile, response] =
    UserClient.useGetProfile({
      workspaceId: workspace.id,
    });
  return [userProfile, isLoadingUserProfile, response];
}
