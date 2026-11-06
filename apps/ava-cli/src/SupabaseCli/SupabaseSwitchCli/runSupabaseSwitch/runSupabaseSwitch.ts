import { ExistingSwitch } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/ExistingSwitch/ExistingSwitch";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { makeSwitchRequestResolutionFromOptions } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/makeSwitchRequestResolutionFromOptions/makeSwitchRequestResolutionFromOptions";
import type {
  SupabaseLocalEnvironmentIo,
  SupabaseSwitchResult,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type RunSupabaseSwitchOptions = {
  io: SupabaseLocalEnvironmentIo;
  requestedProjectId?: string;
  requestedBasePort?: number;
  skipSeed?: boolean;
  confirmReuse: (existingProjectId: string) => Promise<boolean>;
};

/** The result of a switch command after any reuse confirmation. */
export type RunSupabaseSwitchOutcome =
  | { kind: "switched"; result: SupabaseSwitchResult }
  | { kind: "declined"; existingProjectId: string };

/**
 * Resolves the project id, then either creates a new switch or starts the
 * one this branch already has.
 */
export async function runSupabaseSwitch(
  options: Readonly<RunSupabaseSwitchOptions>,
): Promise<RunSupabaseSwitchOutcome> {
  const { io, requestedProjectId, requestedBasePort, skipSeed, confirmReuse } =
    options;
  const branch = await io.readBranch();
  if (branch === "") {
    throw new Error("Supabase switch requires a named Git branch.");
  }
  const existingProject = await ExistingSwitch.readProject(io);
  if (existingProject?.kind === "remote") {
    throw new Error(
      `Branch ${branch} is switched to the hosted project ${existingProject.projectId}. Run \`ava supabase restore\` first, then switch to a local project.`,
    );
  }
  const resolution = makeSwitchRequestResolutionFromOptions({
    branch,
    requestedProjectId,
    existingProjectId: existingProject?.projectId,
  });
  if (resolution.kind === "create") {
    return {
      kind: "switched",
      result: await SupabaseLocalEnvironment.switch({
        io,
        temporaryProjectId: resolution.temporaryProjectId,
        requestedBasePort,
        skipSeed,
      }),
    };
  }
  if (
    resolution.kind === "confirmReuse" &&
    !(await confirmReuse(resolution.existingProjectId))
  ) {
    return {
      kind: "declined",
      existingProjectId: resolution.existingProjectId,
    };
  }
  return { kind: "switched", result: await ExistingSwitch.start(io) };
}
