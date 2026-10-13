import type { SemverBump } from "../inferBumpType/inferBumpType";

/**
 * Builds the contents of a Changesets markdown file naming the given
 * packages at the given bump, with the summary as the changelog body.
 */
export function makeChangesetMarkdown(options: {
  packageNames: readonly string[];
  bump: SemverBump;
  summary: string;
}): string {
  const { packageNames, bump, summary } = options;
  const frontmatterLines = packageNames
    .map((packageName) => {
      return `"${packageName}": ${bump}`;
    })
    .join("\n");
  return `---\n${frontmatterLines}\n---\n\n${summary}\n`;
}
