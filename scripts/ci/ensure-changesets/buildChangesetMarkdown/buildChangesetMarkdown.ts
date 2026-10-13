import type { SemverBump } from "../inferBumpType/inferBumpType";

export type BuildChangesetMarkdownInput = {
  packageNames: readonly string[];
  bump: SemverBump;
  summary: string;
};

/**
 * Builds the contents of a Changesets markdown file naming the given
 * packages at the given bump, with the summary as the changelog body.
 */
export function buildChangesetMarkdown(
  input: BuildChangesetMarkdownInput,
): string {
  const { packageNames, bump, summary } = input;
  const frontmatterLines = packageNames
    .map((packageName) => {
      return `"${packageName}": ${bump}`;
    })
    .join("\n");
  return `---\n${frontmatterLines}\n---\n\n${summary}\n`;
}
