import { createFileRoute, redirect } from "@tanstack/react-router";
import { propEq } from "@utils";
import { AuthClient } from "@/clients/AuthClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { SharedWithMeView } from "@/views/SharedWithMeView/SharedWithMeView";

/**
 * Route guard: only requires the user to be authenticated and a member of the
 * workspace. There is no parent-app permission key because the page exists
 * precisely to surface resources the user can only reach via shares.
 */
export const Route = createFileRoute("/_auth/$workspaceSlug/shared-with-me")({
  component: SharedWithMeView,
  beforeLoad: async ({
    context: { queryClient },
    params: { workspaceSlug },
  }) => {
    if (!isFlagEnabled(FeatureFlag.EnableSharedWithMe)) {
      throw redirect({
        to: AppLinks.workspaceHome(workspaceSlug).to,
        params: { workspaceSlug },
      });
    }

    const session = await AuthClient.getCurrentSession();
    if (!session?.user?.id) {
      throw redirect({ to: "/signin" });
    }
    const workspaces = await WorkspaceClient.withCache(queryClient)
      .withFetchQuery()
      .getWorkspacesOfCurrentUser();
    if (!workspaces.find(propEq("slug", workspaceSlug))) {
      throw redirect({ to: AppLinks.invalidWorkspace.to });
    }
  },
});
