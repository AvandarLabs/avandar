import type { Workspace } from "$/models/Workspace/Workspace";

/** Machine-readable reason a workspace authorization was refused. */
export type WorkspaceMembershipDeniedCode =
  | "not-authenticated"
  | "principal-mismatch"
  | "not-a-member";

function _buildDenialMessage(
  options: Readonly<{
    code: WorkspaceMembershipDeniedCode;
    workspaceId: Workspace.Id;
  }>,
): string {
  switch (options.code) {
    case "not-authenticated":
      return "Cannot authorize workspace access because no user is authenticated.";
    case "principal-mismatch":
      return "Cannot authorize workspace access because the requested user is not the authenticated user.";
    case "not-a-member":
      return `Cannot use workspace ${options.workspaceId} because the user is not a member of it.`;
  }
}

/**
 * Thrown by `assertWorkspaceMembership` when a caller may not act in a
 * workspace.
 *
 * Callers branch on `code` rather than on message prose: a refused principal
 * (`not-authenticated`, `principal-mismatch`) is a different condition from a
 * refused membership (`not-a-member`), and both are different from a failure
 * to read membership at all, which propagates as the underlying fetch error
 * instead of this type. Keeping the read failure out of this class is what
 * lets a caller tell "you may not do this" apart from "we could not find out".
 */
export class WorkspaceMembershipDenied extends Error {
  /** Which authorization condition failed. */
  readonly code: WorkspaceMembershipDeniedCode;

  /** The workspace the caller was refused access to. */
  readonly workspaceId: Workspace.Id;

  /** Creates a denial that names the workspace but never the principal. */
  constructor(
    options: Readonly<{
      code: WorkspaceMembershipDeniedCode;
      workspaceId: Workspace.Id;
    }>,
  ) {
    super(_buildDenialMessage(options));
    this.name = "WorkspaceMembershipDenied";
    this.code = options.code;
    this.workspaceId = options.workspaceId;
  }
}
