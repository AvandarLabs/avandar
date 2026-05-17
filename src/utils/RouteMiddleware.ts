import { redirect } from "@tanstack/react-router";
import { propEq } from "@utils";
import { Permissions } from "$/models/Permissions/Permissions";
import { UserId } from "$/models/User/User.types";
import { AuthClient } from "@/clients/AuthClient";
import { UserClient } from "@/clients/UserClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks";
import type { QueryClient } from "@tanstack/react-query";
import type { PermissionKey } from "$/models/Permissions/Permissions.types";

export const RouteMiddleware = {
  BeforeLoad: {
    /**
     * TanStack Router `beforeLoad` guard to enforce a minimum permission to
     * access a route.
     *
     * @param options.permissionKey Minimum permission required for the route.
     * @param options.appLabel Human-readable app name for access-denied UI.
     */
    checkUserPermissions: ({
      permissionKey,
      appLabel,
    }: {
      permissionKey: PermissionKey;
      appLabel: string;
    }) => {
      return async (loadContext: {
        context: { queryClient: QueryClient };
        params: { workspaceSlug: string };
      }): Promise<void> => {
        const {
          context: { queryClient },
          params: { workspaceSlug },
        } = loadContext;
        const workspaces = await WorkspaceClient.withCache(queryClient)
          .withFetchQuery()
          .getWorkspacesOfCurrentUser();
        const workspace = workspaces.find(propEq("slug", workspaceSlug));

        if (!workspace) {
          throw redirect({ to: AppLinks.invalidWorkspace.to });
        }

        const session = await AuthClient.getCurrentSession();
        const userId = session?.user?.id;
        if (!userId) {
          throw redirect({ to: "/signin" });
        }

        const rolesMatrix = await UserClient.withCache(queryClient)
          .withFetchQuery()
          .getUserAppRoles({
            workspaceId: workspace.id,
            userId: userId as UserId,
          });

        if (
          Permissions.rolesMatrixHasPermission({
            roles: rolesMatrix,
            permissionKey: permissionKey,
          })
        ) {
          return;
        }

        throw redirect({
          to: "/$workspaceSlug/access-denied",
          params: { workspaceSlug: workspaceSlug },
          search: { app: appLabel },
        });
      };
    },
  },
};
