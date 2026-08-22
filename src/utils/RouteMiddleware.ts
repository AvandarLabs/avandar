import { propEq } from "@avandar/utils";
import { redirect } from "@tanstack/react-router";
import { Permissions } from "$/models/Permissions/Permissions";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { UserClient } from "@/clients/UserClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import type {
  PermissionKey,
  RoleLevel,
} from "$/models/Permissions/Permissions.types";
import type { User } from "$/models/User/User";
import type { ResourceType } from "@/clients/UserClient";
import type { QueryClient } from "@tanstack/react-query";

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

type PermissionCheckOptions = {
  permissionKey: PermissionKey;
  appLabel: string | (() => string);
  resourceFallback?: ResourceFallback;
};

type PermissionLoadContext = {
  context: { queryClient: QueryClient };
  params: { workspaceSlug: string };
};

type PermissionContext = {
  extraParams: Record<string, string | undefined>;
  queryClient: QueryClient;
  rolesMatrix: Awaited<ReturnType<typeof UserClient.getUserAppRoles>>;
  workspaceSlug: string;
};

async function _getPermissionContext(
  loadContext: Readonly<PermissionLoadContext>,
): Promise<PermissionContext> {
  const { queryClient } = loadContext.context;
  const { workspaceSlug } = loadContext.params;
  const workspaces = await WorkspaceClient.withCache(queryClient)
    .withFetchQuery()
    .getWorkspacesOfCurrentUser();
  const workspace = workspaces.find(propEq("slug", workspaceSlug));
  if (!workspace) {
    throw redirect({ to: AppLinks.invalidWorkspace.to });
  }
  const session = await AuthClient.getCurrentSession();
  if (!session?.user?.id) {
    throw redirect({ to: "/signin" });
  }
  const rolesMatrix = await UserClient.withCache(queryClient)
    .withFetchQuery()
    .getUserAppRoles({
      workspaceId: workspace.id,
      userId: session.user.id as User.Id,
    });
  return {
    extraParams: loadContext.params as Record<string, string | undefined>,
    queryClient,
    rolesMatrix,
    workspaceSlug,
  };
}

async function _checkUserPermissions(
  options: Readonly<{
    permissionOptions: Readonly<PermissionCheckOptions>;
    loadContext: Readonly<PermissionLoadContext>;
  }>,
): Promise<void> {
  const { permissionOptions, loadContext } = options;
  const context = await _getPermissionContext(loadContext);
  if (
    Permissions.rolesMatrixHasPermission({
      roles: context.rolesMatrix,
      permissionKey: permissionOptions.permissionKey,
    })
  ) {
    return;
  }
  if (
    await _canUseResourceFallback({
      permissionOptions,
      extraParams: context.extraParams,
      queryClient: context.queryClient,
    })
  ) {
    return;
  }
  throw redirect({
    to: "/$workspaceSlug/access-denied",
    params: { workspaceSlug: context.workspaceSlug },
    search: {
      app:
        typeof permissionOptions.appLabel === "function"
          ? permissionOptions.appLabel()
          : permissionOptions.appLabel,
    },
  });
}

async function _canUseResourceFallback(
  options: Readonly<{
    permissionOptions: Readonly<PermissionCheckOptions>;
    extraParams: Readonly<Record<string, string | undefined>>;
    queryClient: QueryClient;
  }>,
): Promise<boolean> {
  const { resourceFallback } = options.permissionOptions;
  if (!resourceFallback) {
    return false;
  }
  const resourceId = options.extraParams[resourceFallback.idParam];
  if (!resourceId) {
    return false;
  }
  return UserClient.withCache(options.queryClient)
    .withFetchQuery()
    .canAccessResource({
      resourceType: resourceFallback.type,
      resourceId,
      minRole: resourceFallback.minRole,
    });
}

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
    }: Readonly<PermissionCheckOptions>) => {
      const permissionOptions = { permissionKey, appLabel, resourceFallback };
      return async (
        loadContext: Readonly<PermissionLoadContext>,
      ): Promise<void> => {
        return _checkUserPermissions({ permissionOptions, loadContext });
      };
    },
  },
};
