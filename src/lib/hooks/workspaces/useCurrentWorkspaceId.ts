import { WorkspaceId } from "@/models/Workspace/types";
import { useCurrentWorkspace } from "./useCurrentWorkspace";

/**
 * Get the current workspace ID.
 * This requires that we be inside a workspace route (i.e. any route
 * within `/_auth/$workspaceSlug/`)
 *
 * Very lightweight wrapper around `useCurrentWorkspace()` just because
 * of how common it is to just need the `id`.
 * @returns The current workspace ID
 */
export function useCurrentWorkspaceId(): WorkspaceId {
  const currentWorkspace = useCurrentWorkspace();
  return currentWorkspace.id;
}
