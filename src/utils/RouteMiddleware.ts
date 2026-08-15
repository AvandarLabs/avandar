import { isFunction, propEq } from "@avandar/utils";
import { redirect } from "@tanstack/react-router";
import { Permissions } from "$/models/Permissions/Permissions";
import { UserId } from "$/models/User/User.types";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { UserClient } from "@/clients/UserClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import type { ResourceType } from "@/clients/UserClient";
import type { QueryClient } from "@tanstack/react-query";
import type {
  PermissionKey,
  RoleLevel,
} from "$/models/Permissions/Permissions.types";

/**
 * Optional fallback for `checkUserPermissions` that lets a user reach a
 * deep route via share-derived access alone, when the parent app
 * permission key would otherwise deny them.
 */
export type ResourceFallback = {
  /** Resource kind to check (`dataset`, `dashboard`, or `map`). */
  type: ResourceType;
  /** Param name on the route that carries the resource id. */
  idParam: string;
  /** Minimum effective role on the resource to allow access. */
  minRole: RoleLevel;
};

export const RouteMiddleware = {
  BeforeLoad: {
    /**
     * TanStack Router `beforeLoad` guard to enforce a minimum permission to
     * access a route.
     *
     * Behavior:
     * 1. Confirms the user is a member of the workspace and is authenticated.
     * 2. Allows access when the user has the requested `permissionKey` via
     *    their `workspace_memberships.role_group` matrix.
     * 3. If a `resourceFallback` is provided and the parent app permission
     *    check fails, checks `util__auth_user_can_access_resource` for the
     *    resource id taken from `params[resourceFallback.idParam]`. When that
     *    returns `true`, access is granted; otherwise the user is redirected
     *    to the access-denied page.
     *
     * The fallback is purely additive: when omitted (the existing call sites)
     * the previous "redirect to access-denied" behavior is preserved
     * verbatim.
     *
     * @param options.permissionKey Minimum permission required for the route.
     * @param options.appLabel Human-readable app name for access-denied UI,
     * or a thunk when resolving it requires initialized runtime state.
     * @param options.resourceFallback Optional per-resource fallback.
     */
    checkUserPermissions: ({
      permissionKey,
      appLabel,
      resourceFallback,
    }: {
      permissionKey: PermissionKey;
      appLabel: string | (() => string);
      resourceFallback?: ResourceFallback;
    }) => {
      return async (loadContext: {
        context: { queryClient: QueryClient };
        params: { workspaceSlug: string };
      }): Promise<void> => {
        const {
          context: { queryClient },
          params: { workspaceSlug },
        } = loadContext;
        // Resource fallback may reference dynamic child params (e.g.
        // datasetId, dashboardId). Reading those requires loosening the
        // typed-params view since the parent route only declares
        // `workspaceSlug` in its contract.
        const extraParams = loadContext.params as Record<
          string,
          string | undefined
        >;
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

        if (resourceFallback) {
          const resourceId = extraParams[resourceFallback.idParam];
          if (resourceId) {
            const canAccess = await UserClient.withCache(queryClient)
              .withFetchQuery()
              .canAccessResource({
                resourceType: resourceFallback.type,
                resourceId: resourceId,
                minRole: resourceFallback.minRole,
              });
            if (canAccess) {
              return;
            }
          }
        }

        throw redirect({
          to: "/$workspaceSlug/access-denied",
          params: { workspaceSlug: workspaceSlug },
          search: {
            app: isFunction(appLabel) ? appLabel() : appLabel,
          },
        });
      };
    },
  },
};
