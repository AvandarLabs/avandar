import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import type { SupabaseSwitchSummary } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { CliStyle } from "@ava-cli/utils/CliTheme/CliTheme";

/** One line of the headline and the style it is printed in. */
export type HeadlineLine = { style: CliStyle; text: string };

/** The parts of a switch summary the headline names. */
type HeadlineSummary = Omit<SupabaseSwitchSummary, "config">;

function _makeTargetLine(summary: Readonly<HeadlineSummary>): HeadlineLine {
  const { branch, projectId } = summary;
  switch (summary.switchKind) {
    case "shared":
      return {
        style: "success",
        text: `✅ This is the develop local Supabase (${summary.sharedProjectId}). Branch ${branch} uses it.`,
      };
    case "local":
      return {
        style: "warning",
        text: `⚠️  Branch ${branch} is on a switched local Supabase database: ${projectId}.`,
      };
    case "remote":
      return {
        style: "warning",
        text: `⚠️  Branch ${branch} is switched to a remote Supabase database: ${projectId} (${summary.remoteApiUrl ?? "unknown URL"}).`,
      };
  }
}

function _makeLines(
  options: Readonly<{ summary: HeadlineSummary }>,
): HeadlineLine[] {
  const { summary } = options;
  return [
    _makeTargetLine(summary),
    ...(summary.hasStrayOverride
      ? [
          {
            style: "warning" as const,
            text: `⚠️  .env.development points the Supabase CLI at ${summary.projectId}, but no switch on branch ${summary.branch} wrote that. Delete the \`ava supabase switch\` block from .env.development, or run \`ava supabase switch\`.`,
          },
        ]
      : []),
  ];
}

/**
 * The opening lines of `ava supabase start`, `stop`, and `status`: which
 * database the command is about to touch, so nobody stops the shared develop
 * stack or a hosted project by mistake.
 */
export const SupabaseTargetHeadline = {
  /** The headline lines for a switch summary. */
  makeLines: _makeLines,

  /** Prints the headline to a stream, stderr by default. */
  print: (
    options: Readonly<{
      summary: HeadlineSummary;
      stream?: NodeJS.WriteStream;
    }>,
  ): void => {
    _makeLines(options).forEach(({ style, text }) => {
      CliTheme.writeLine({
        stream: options.stream ?? process.stderr,
        style,
        text,
      });
    });
  },
};
