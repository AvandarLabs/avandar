import { PruneCandidateText } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneCandidateText/PruneCandidateText";
import { TerminalMenu } from "@ava-cli/utils/TerminalMenu/TerminalMenu";
import { propEq, valNotEq } from "@avandar/utils";
import type { PruneCandidate } from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";

/** The `ava supabase prune` flags that decide what gets deleted. */
export type SupabasePruneFlags = {
  all?: boolean;
  includeUnverified?: boolean;
  keep?: string;
  dryRun?: boolean;
  images?: boolean;
};

/** Which candidates to delete, or why none were chosen. */
export type PruneSelectionResult =
  | { kind: "selected"; candidates: PruneCandidate[] }
  | { kind: "failed"; message: string; hint: string }
  | { kind: "cancelled" };

function _selectFromKeepIds(
  options: Readonly<{
    candidates: readonly PruneCandidate[];
    unattendedCandidates: readonly PruneCandidate[];
    keepText: string;
  }>,
): PruneSelectionResult {
  const keepIds = options.keepText.split(/[\s,]+/).filter(valNotEq(""));
  const unknownIds = keepIds.filter((keepId) => {
    return !options.candidates.some(propEq("project.projectId", keepId));
  });
  return unknownIds.length > 0
    ? {
        kind: "failed",
        message: `--keep names ${unknownIds.join(", ")}, which is not a prune candidate.`,
        hint: "Run `ava supabase prune --dry-run` to see the candidate ids.",
      }
    : {
        kind: "selected",
        candidates: options.unattendedCandidates.filter(({ project }) => {
          return !keepIds.includes(project.projectId);
        }),
      };
}

/** Asks in the terminal, starting with every verified candidate selected. */
async function _promptForCandidates(
  candidates: readonly PruneCandidate[],
): Promise<PruneSelectionResult> {
  const result = await TerminalMenu.prompt({
    title: "Delete these local Supabase projects? Unselect any to keep.",
    hint: "space toggles, a toggles all, ↑/↓ or j/k move, Enter deletes the selected ones, Esc cancels",
    labels: candidates.map(PruneCandidateText.fromCandidate),
    isMultiSelect: true,
    initialState: {
      cursorIndex: 0,
      selectedIndexes: candidates.flatMap(({ isVerified }, index) => {
        return isVerified ? [index] : [];
      }),
    },
  });
  return result.kind === "cancel"
    ? { kind: "cancelled" }
    : {
        kind: "selected",
        candidates: candidates.filter((_candidate, index) => {
          return result.state.selectedIndexes.includes(index);
        }),
      };
}

async function _select(
  options: Readonly<{
    candidates: readonly PruneCandidate[];
    flags: Readonly<SupabasePruneFlags>;
  }>,
): Promise<PruneSelectionResult> {
  const { candidates, flags } = options;
  const unattendedCandidates = candidates.filter(({ isVerified }) => {
    return isVerified || flags.includeUnverified === true;
  });
  if (flags.all === true) {
    return { kind: "selected", candidates: unattendedCandidates };
  }
  if (flags.keep !== undefined) {
    return _selectFromKeepIds({
      candidates,
      unattendedCandidates,
      keepText: flags.keep,
    });
  }
  return TerminalMenu.isAvailable()
    ? await _promptForCandidates(candidates)
    : {
        kind: "failed",
        message: "Nothing was pruned: there is no terminal to choose on.",
        hint: "Run `ava supabase prune --all`, `ava supabase prune --keep <id...>`, or `ava supabase prune --dry-run`.",
      };
}

/**
 * Decides what `ava supabase prune` deletes: every verified candidate for
 * `--all`, all but the named ones for `--keep`, or what the user leaves
 * selected in the terminal menu. A candidate known only by its name is never
 * chosen without `--include-unverified` or a pick by hand.
 *
 * Used by `SupabasePruneCli`.
 */
export const PruneSelection = {
  /** The candidates to delete, or why there are none. */
  select: _select,

  /**
   * Whether to also delete the images the pruned projects used: `--images`
   * in an unattended run, otherwise the user's answer in the terminal.
   */
  shouldDeleteImages: async (
    flags: Readonly<SupabasePruneFlags>,
  ): Promise<boolean> => {
    const isDecidedByFlags =
      flags.images === true || flags.all === true || flags.keep !== undefined;
    return isDecidedByFlags
      ? flags.images === true
      : await TerminalMenu.confirm({
          question:
            "Also delete the images these projects used, if no other container needs them? The next `supabase start` downloads them again.",
          isYesDefault: false,
        });
  },
};
