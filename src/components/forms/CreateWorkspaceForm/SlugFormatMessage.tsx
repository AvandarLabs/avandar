import { Trans } from "@lingui/react/macro";
import { match } from "ts-pattern";
import {
  WORKSPACE_SLUG_MAX_LENGTH,
  WORKSPACE_SLUG_MIN_LENGTH,
} from "@/components/forms/getWorkspaceSlugFormatProblem/getWorkspaceSlugFormatProblem";
import type { WorkspaceSlugFormatProblem } from "@/components/forms/getWorkspaceSlugFormatProblem/getWorkspaceSlugFormatProblem";
import type { ReactNode } from "react";

type Props = {
  problem: WorkspaceSlugFormatProblem;
};

/**
 * Translates a slug format problem into a short fix the user can act on.
 * Rendered by `SlugCheckMessage` for an invalid slug and by the
 * `workspaceSlug` `validateFn` in `CreateWorkspaceForm`.
 */
export function SlugFormatMessage({ problem }: Props): ReactNode {
  return match(problem)
    .with("empty", () => {
      return <Trans>Enter an ID for your workspace.</Trans>;
    })
    .with("too_short", () => {
      return (
        <Trans>Use at least {WORKSPACE_SLUG_MIN_LENGTH} characters.</Trans>
      );
    })
    .with("too_long", () => {
      return (
        <Trans>Use {WORKSPACE_SLUG_MAX_LENGTH} characters or fewer.</Trans>
      );
    })
    .with("invalid_characters", () => {
      return <Trans>Use only letters, numbers, and hyphens.</Trans>;
    })
    .exhaustive();
}
