import { useRef, useState } from "react";
import { WorkspaceClient } from "@/clients/WorkspaceClient";

/** The shortest workspace slug the server accepts. */
export const WORKSPACE_SLUG_MIN_LENGTH = 3;

/** The longest workspace slug the server accepts. */
export const WORKSPACE_SLUG_MAX_LENGTH = 20;

/** Why a workspace slug fails the format rules, before any server check. */
export type WorkspaceSlugFormatProblem =
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_characters";

/** Where a workspace slug is in its availability check. */
export type WorkspaceSlugCheck =
  | { status: "idle" }
  | { status: "invalid"; slug: string; problem: WorkspaceSlugFormatProblem }
  | { status: "checking"; slug: string }
  | { status: "available"; slug: string }
  | { status: "taken"; slug: string }
  | { status: "failed"; slug: string };

/**
 * Checks a workspace slug against the same format rules the server enforces.
 *
 * @returns The first problem found, or `undefined` if the format is valid.
 */
export function getWorkspaceSlugFormatProblem(
  slug: string,
): WorkspaceSlugFormatProblem | undefined {
  if (!slug) {
    return "empty";
  }
  if (slug.length < WORKSPACE_SLUG_MIN_LENGTH) {
    return "too_short";
  }
  if (slug.length > WORKSPACE_SLUG_MAX_LENGTH) {
    return "too_long";
  }
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
    return "invalid_characters";
  }
  return undefined;
}

/**
 * Tracks whether a workspace slug is free to use. Malformed slugs are
 * rejected locally without a request. Answers for a slug the user has since
 * changed are ignored, so a slow response never overwrites a newer one.
 *
 * @returns The current check and a function to check a new slug.
 */
export function useWorkspaceSlugCheck(): [
  WorkspaceSlugCheck,
  (slug: string) => void,
] {
  const [slugCheck, setSlugCheck] = useState<WorkspaceSlugCheck>({
    status: "idle",
  });
  const latestSlugRef = useRef<string | undefined>(undefined);
  const [isSlugAvailable] = WorkspaceClient.useIsWorkspaceSlugAvailable({
    onSuccess: (isAvailable, { workspaceSlug }) => {
      if (workspaceSlug === latestSlugRef.current) {
        setSlugCheck({
          status: isAvailable ? "available" : "taken",
          slug: workspaceSlug,
        });
      }
    },
    onError: (_error, { workspaceSlug }) => {
      if (workspaceSlug === latestSlugRef.current) {
        setSlugCheck({ status: "failed", slug: workspaceSlug });
      }
    },
  });

  const checkSlug = (slug: string): void => {
    latestSlugRef.current = slug;
    const formatProblem = getWorkspaceSlugFormatProblem(slug);
    if (formatProblem) {
      setSlugCheck({ status: "invalid", slug, problem: formatProblem });
      return;
    }
    setSlugCheck({ status: "checking", slug });
    isSlugAvailable({ workspaceSlug: slug });
  };

  return [slugCheck, checkSlug];
}
