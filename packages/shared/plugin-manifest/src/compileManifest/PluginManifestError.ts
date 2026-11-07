/**
 * Thrown when a plugin's manifest is invalid. Carries every problem found,
 * not only the first, so one build run surfaces them all.
 */
export class PluginManifestError extends Error {
  readonly sourcePath: string;
  readonly issues: readonly string[];

  constructor(options: { sourcePath: string; issues: readonly string[] }) {
    const issueLines = options.issues
      .map((issue) => {
        return `  - ${issue}`;
      })
      .join("\n");
    super(`Invalid plugin manifest ${options.sourcePath}:\n${issueLines}`);
    this.name = "PluginManifestError";
    this.sourcePath = options.sourcePath;
    this.issues = options.issues;
  }
}
