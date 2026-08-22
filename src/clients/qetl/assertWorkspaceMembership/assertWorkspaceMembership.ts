import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

import { propEq } from "@avandar/utils";

import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { WorkspaceMembershipDenied } from "@/clients/qetl/assertWorkspaceMembership/WorkspaceMembershipDenied";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";

/**
 * Rejects a caller who is not a member of `workspaceId`, and returns the
 * authenticated user id it verified.
 *
 * This is the principal-level check: it asserts that the user may act **in the
 * named workspace**. It does not assert that every relation named by a query
 * belongs to that workspace. That per-relation check is a separate mechanism,
 * currently provided by `WorkspaceQuerySession`'s `getQueryDependencies`, which
 * intersects the SQL's table references with the dataset ids of the named
 * workspace, so a dataset owned by another workspace is never loaded. If a
 * relation cache probe is ever wired ahead of source dispatch, it would bypass
 * `getQueryDependencies`, so that probe must carry its own per-relation
 * workspace check; this assertion does not cover it.
 *
 * The workspace list is session-scoped, so `userId` must always be the
 * authenticated user. Omit it to authorize whoever is signed in. Pass it when
 * the caller already holds a principal (a cache probe that read one out of a
 * cache key, for instance) and must state which principal it is acting for; a
 * `userId` that disagrees with the session is rejected rather than ignored.
 *
 * Membership is read through the query cache, so a revoked membership keeps
 * passing for as long as the cached list stays fresh: at most 6 minutes while
 * online (`AvaQueryClient`'s `staleTime`), and for as long as the persisted
 * entry survives while offline, since offline queries are never stale. A read
 * served from cache makes no server call, so RLS is not a backstop for this
 * check; on a probe path that answers entirely from local storage it is not a
 * backstop in any sense.
 *
 * A failure to read membership (a cold cache with no network, for example)
 * rejects with the underlying fetch error untouched, so an infrastructure
 * failure stays distinguishable from a denial. An offline authorization window
 * is an accepted policy for this system but is not implemented here.
 *
 * @param options.workspaceId The workspace the caller wants to act in.
 * @param options.userId The principal the caller is acting for, which must be
 * the authenticated user. Defaults to the authenticated user.
 * @returns The authenticated user id, cross-checked against `userId` when one
 * was given.
 * @throws WorkspaceMembershipDenied if nobody is authenticated, if `userId` is
 * not the authenticated user, or if that user is not a member of
 * `workspaceId`. Rethrows the underlying error if membership could not be
 * read.
 */
export async function assertWorkspaceMembership(
  options: Readonly<{
    workspaceId: Workspace.Id;
    userId?: UserId;
  }>,
): Promise<UserId> {
  const session = await AuthClient.getCurrentSession();
  const authenticatedUserId = session?.user?.id as UserId | undefined;

  // `UserId` is a compile-time brand and constrains nothing at runtime, so a
  // caller can hand over an `undefined` principal. Establish that someone is
  // authenticated before comparing anything: otherwise `undefined ===
  // undefined` would admit an unauthenticated caller, and the membership read
  // below would answer from whatever list a previously signed-in user left in
  // the query cache for this tab.
  if (!authenticatedUserId) {
    throw new WorkspaceMembershipDenied({
      code: "not-authenticated",
      workspaceId: options.workspaceId,
    });
  }
  if (options.userId !== undefined && options.userId !== authenticatedUserId) {
    throw new WorkspaceMembershipDenied({
      code: "principal-mismatch",
      workspaceId: options.workspaceId,
    });
  }

  // `fetchQuery` serves a fresh cache entry with no network call, dedupes
  // concurrent callers on the key, and honors invalidation, so the workspace
  // invalidation `useAuth` fires on sign-in actually lands here. A plain
  // `getQueryData` read would skip all three and would also trust forever the
  // empty list `WorkspaceClient.getWorkspacesOfCurrentUser` caches as a
  // success when the session read fails.
  const workspaces = await WorkspaceClient.withCache(AvaQueryClient)
    .withFetchQuery()
    .getWorkspacesOfCurrentUser();

  // An empty list is an answer (deny), never a cache miss worth retrying.
  if (!workspaces.some(propEq("id", options.workspaceId))) {
    throw new WorkspaceMembershipDenied({
      code: "not-a-member",
      workspaceId: options.workspaceId,
    });
  }

  return authenticatedUserId;
}
