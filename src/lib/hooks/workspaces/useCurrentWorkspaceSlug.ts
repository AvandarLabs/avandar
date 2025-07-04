import { useCurrentWorkspace } from "./useCurrentWorkspace";

/**
 * Get the current workspace slug.
 * This requires that we be inside a workspace route (i.e. any route
 * within `/_auth/$workspaceSlug/`)
 *
 * Very lightweight wrapper around `useCurrentWorkspace()` just because
 * of how common it is to just need the `slug`.
 * @returns The current workspace slug
 */
export function useCurrentWorkspaceSlug(): string {
  const currentWorkspace = useCurrentWorkspace();
  return currentWorkspace.slug;
}
