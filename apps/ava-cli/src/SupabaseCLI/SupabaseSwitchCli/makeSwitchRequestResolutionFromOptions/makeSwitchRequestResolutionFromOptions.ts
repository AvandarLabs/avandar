import { makeTemporaryProjectIdFromBranch } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/makeTemporaryProjectIdFromBranch/makeTemporaryProjectIdFromBranch";

/** How `ava supabase switch` should treat the requested project id. */
export type SwitchRequestResolution =
  | { kind: "create"; temporaryProjectId: string }
  | { kind: "reuse"; existingProjectId: string }
  | { kind: "confirmReuse"; existingProjectId: string };

type ResolveSwitchRequestOptions = {
  branch: string;
  requestedProjectId: string | undefined;
  existingProjectId: string | undefined;
};

/**
 * Decides whether to create a new switch, reuse this branch's existing one,
 * or ask before reusing it.
 *
 * A branch may have only one switch. Asking for a different id, or omitting
 * the id when one already exists, must not create a second project.
 */
export function makeSwitchRequestResolutionFromOptions(
  options: Readonly<ResolveSwitchRequestOptions>,
): SwitchRequestResolution {
  const { branch, requestedProjectId, existingProjectId } = options;
  if (existingProjectId === undefined) {
    return {
      kind: "create",
      temporaryProjectId:
        requestedProjectId ?? makeTemporaryProjectIdFromBranch(branch),
    };
  }
  if (requestedProjectId === existingProjectId) {
    return { kind: "reuse", existingProjectId };
  }
  return { kind: "confirmReuse", existingProjectId };
}
