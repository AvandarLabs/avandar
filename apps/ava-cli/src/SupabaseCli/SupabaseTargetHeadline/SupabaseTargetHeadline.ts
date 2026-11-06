import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { isDefined, matchLiteral } from "@avandar/utils";
import type { SupabaseSwitchSummary } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { CliStyle } from "@ava-cli/utils/CliTheme/CliTheme";

/** One line of the headline and the style it is printed in. */
export type HeadlineLine = { style: CliStyle; text: string };

/** The parts of a switch summary the headline names. */
type HeadlineSummary = Omit<SupabaseSwitchSummary, "config">;

function _makeLinesFromSummary(
  summary: Readonly<HeadlineSummary>,
): HeadlineLine[] {
  const { branch, projectId } = summary;
  return [
    matchLiteral(summary.switchKind, {
      shared: {
        style: "success",
        text: `✅ This is the develop local Supabase (${summary.sharedProjectId}). Branch ${branch} uses it.`,
      },
      local: {
        style: "warning",
        text: `⚠️  Branch ${branch} is on a switched local Supabase database: ${projectId}.`,
      },
      remote: {
        style: "warning",
        text: `⚠️  Branch ${branch} is switched to a remote Supabase database: ${projectId} (${summary.remoteApiUrl ?? "unknown URL"}).`,
      },
    } satisfies Record<SupabaseSwitchSummary["switchKind"], HeadlineLine>),
    summary.hasStrayOverride
      ? {
          style: "warning" as const,
          text: `⚠️  .env.development points the Supabase CLI at ${projectId}, but no switch on branch ${branch} wrote that. Delete the \`ava supabase switch\` block from .env.development, or run \`ava supabase switch\`.`,
        }
      : undefined,
  ].filter(isDefined);
}

/**
 * The opening lines of `ava supabase start`, `stop`, and `status`: which
 * database the command is about to touch, so nobody stops the shared develop
 * stack or a hosted project by mistake.
 */
export const SupabaseTargetHeadline = {
  /** The headline lines for a switch summary. */
  makeLinesFromSummary: _makeLinesFromSummary,

  /** Prints the headline to a stream, stderr by default. */
  print: ({
    summary,
    stream = process.stderr,
  }: Readonly<{
    summary: HeadlineSummary;
    stream?: NodeJS.WriteStream;
  }>): void => {
    _makeLinesFromSummary(summary).forEach(({ style, text }) => {
      CliTheme.writeLine({ stream, style, text });
    });
  },
};
