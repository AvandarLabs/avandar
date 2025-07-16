import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
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
 * @returns A tuple containing the user profile and a boolean
 * indicating if the data is loading.
 */
export function useCurrentUserProfile():
  | [userProfile: UserProfile, isLoading: false]
  | [userProfile: undefined, isLoading: true] {
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile] = UserClient.useGetProfile({
    workspaceId: workspace.id,
  });
  return isLoadingUserProfile || !userProfile ?
      [undefined, true]
    : [userProfile, false];
}
