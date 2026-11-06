import { useRef, useState } from "react";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { getWorkspaceSlugFormatProblem } from "@/components/forms/getWorkspaceSlugFormatProblem/getWorkspaceSlugFormatProblem";
import type { WorkspaceSlugFormatProblem } from "@/components/forms/getWorkspaceSlugFormatProblem/getWorkspaceSlugFormatProblem";

/** Where a workspace slug is in its availability check. */
export type WorkspaceSlugCheck =
  | { status: "idle" }
  | { status: "invalid"; slug: string; problem: WorkspaceSlugFormatProblem }
  | { status: "checking"; slug: string }
  | { status: "available"; slug: string }
  | { status: "taken"; slug: string }
  | { status: "failed"; slug: string };

/**
 * Tracks whether a workspace slug is free to use. Malformed slugs are
 * rejected locally without a request. Answers for a slug the user has since
 * changed are ignored, so a slow response never overwrites a newer one.
 * For example, a workspace form calls the returned function on each slug
 * change and enables submit only once the check reads `available`.
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
  const [requestSlugAvailability] = WorkspaceClient.useIsWorkspaceSlugAvailable(
    {
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
    },
  );

  const checkSlug = (slug: string): void => {
    latestSlugRef.current = slug;
    const formatProblem = getWorkspaceSlugFormatProblem(slug);
    if (formatProblem) {
      setSlugCheck({ status: "invalid", slug, problem: formatProblem });
      return;
    }
    setSlugCheck({ status: "checking", slug });
    requestSlugAvailability({ workspaceSlug: slug });
  };

  return [slugCheck, checkSlug];
}
