import { describe, expect, it } from "vitest";
import { buildChangesetMarkdown } from "./buildChangesetMarkdown";

describe("buildChangesetMarkdown", () => {
  it("builds frontmatter and body for a single package", () => {
    const markdown = buildChangesetMarkdown({
      packageNames: ["@avandar/ui"],
      bump: "patch",
      summary: "Fix button alignment (#123)",
    });
    expect(markdown).toBe(
      '---\n"@avandar/ui": patch\n---\n\nFix button alignment (#123)\n',
    );
  });

  it("lists every package on its own frontmatter line, in order", () => {
    const markdown = buildChangesetMarkdown({
      packageNames: ["@avandar/ui", "@avandar/utils"],
      bump: "minor",
      summary: "Add new hook (#124)",
    });
    expect(markdown).toBe(
      '---\n"@avandar/ui": minor\n"@avandar/utils": minor\n---\n\nAdd new hook (#124)\n',
    );
  });
});
