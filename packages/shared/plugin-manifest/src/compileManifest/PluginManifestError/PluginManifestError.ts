const CONTINUATION_INDENT = "    ";

/**
 * Builds one `  - ` bullet. Continuation lines are indented to sit under the
 * bullet text, and blank lines stay empty so no trailing spaces appear.
 */
function _buildIssueBullet(issue: string): string {
  return `  - ${issue.trimEnd().replace(/\n(?=.)/g, `\n${CONTINUATION_INDENT}`)}`;
}

/**
 * Thrown when a plugin's manifest is invalid. Carries every problem found in
 * the stage that failed, not only the first, so one build run surfaces them
 * together.
 */
export class PluginManifestError extends Error {
  readonly sourcePath: string;
  readonly issues: readonly string[];

  constructor(options: { sourcePath: string; issues: readonly string[] }) {
    const issueLines = options.issues
      .map((issue) => {
        return _buildIssueBullet(issue);
      })
      .join("\n");
    super(`Invalid plugin manifest ${options.sourcePath}:\n${issueLines}`);
    this.name = "PluginManifestError";
    this.sourcePath = options.sourcePath;
    this.issues = options.issues;
  }
}
