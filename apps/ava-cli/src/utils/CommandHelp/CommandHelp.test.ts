import { CommandHelp } from "@ava-cli/utils/CommandHelp/CommandHelp";
import { Acclimate } from "@avandar/acclimate";
import { describe, expect, it } from "vitest";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const ROOT_CLI = Acclimate.createCLI("ava").addGlobalOption({
  name: "--staging",
  description: "Use staging.",
  required: false,
  type: "boolean",
});

const SWITCH_SPEC: CommandHelpSpec = {
  commandPath: ["supabase", "switch"],
  cli: Acclimate.createCLI("switch")
    .description("Start an isolated local Supabase project for this branch.")
    .addPositionalArg({
      name: "temporaryProjectId",
      description: "Project id.",
      required: false,
      type: "string",
    })
    .addOption({
      name: "--no-seed",
      description: "Skip the seed.",
      required: false,
      type: "boolean",
    }),
  usage: ["ava supabase switch [project-id] [--no-seed]"],
  labels: { temporaryProjectId: "[project-id]" },
  examples: [
    { label: "ava supabase switch", description: "Switch this branch." },
    { label: "ava supabase switch --no-seed", description: "Leave it empty." },
  ],
};

const SWITCH_REMOTE_SPEC: CommandHelpSpec = {
  commandPath: ["supabase", "switch", "remote"],
  cli: Acclimate.createCLI("remote")
    .description("Point this worktree at a hosted Supabase project.")
    .addOption({
      name: "--project-id",
      aliases: ["-p"],
      description: "Hosted project ref.",
      required: false,
      type: "string",
    }),
  usage: ["ava supabase switch remote [--project-id <ref>]"],
  labels: { "--project-id": "<ref>" },
  examples: [
    { label: "ava supabase switch remote", description: "Answer prompts." },
  ],
};

const SPECS = [SWITCH_SPEC, SWITCH_REMOTE_SPEC];

describe("CommandHelp.findSpecFromArgv", () => {
  it("matches the deepest command the leading words name", () => {
    expect(
      CommandHelp.findSpecFromArgv({
        argv: ["supabase", "switch", "remote", "--help"],
        specs: SPECS,
      }),
    ).toBe(SWITCH_REMOTE_SPEC);
  });

  it("matches a command followed by its own positional arguments", () => {
    expect(
      CommandHelp.findSpecFromArgv({
        argv: ["supabase", "switch", "my-project", "55321"],
        specs: SPECS,
      }),
    ).toBe(SWITCH_SPEC);
  });

  it("matches nothing for a command without a help spec", () => {
    expect(
      CommandHelp.findSpecFromArgv({
        argv: ["supabase", "migrations", "validate"],
        specs: SPECS,
      }),
    ).toBeUndefined();
  });
});

describe("CommandHelp.isHelpRequested", () => {
  it("recognises --help and -h wherever they appear", () => {
    expect(
      [
        ["supabase", "prune", "--help"],
        ["supabase", "-h", "prune"],
      ].map(CommandHelp.isHelpRequested),
    ).toEqual([true, true]);
  });

  it("returns false when neither help flag is present", () => {
    expect(CommandHelp.isHelpRequested(["supabase", "prune", "--all"])).toBe(
      false,
    );
  });
});

describe("CommandHelp.findUnknownFlags", () => {
  it("accepts an option's name and its alias", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "remote", "-p", "a", "--project-id", "a"],
        spec: SWITCH_REMOTE_SPEC,
        rootCli: ROOT_CLI,
      }),
    ).toEqual([]);
  });

  it("accepts a global option the root declares", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "--staging"],
        spec: SWITCH_SPEC,
        rootCli: ROOT_CLI,
      }),
    ).toEqual([]);
  });

  it("returns a flag the command does not declare", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "--noseed"],
        spec: SWITCH_SPEC,
        rootCli: ROOT_CLI,
      }),
    ).toEqual(["--noseed"]);
  });

  it("checks only the flag half of a --flag=value token", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "remote", "--project-id=abc"],
        spec: SWITCH_REMOTE_SPEC,
        rootCli: ROOT_CLI,
      }),
    ).toEqual([]);
  });
});

describe("CommandHelp.makeHelpLines", () => {
  function _makeHelpText(spec: CommandHelpSpec): string {
    return CommandHelp.makeHelpLines({
      spec,
      rootCli: ROOT_CLI,
      isColorEnabled: false,
    }).join("\n");
  }

  it("shows the command's description and usage", () => {
    const helpText = _makeHelpText(SWITCH_SPEC);

    expect(helpText).toContain(
      "Start an isolated local Supabase project for this branch.",
    );
    expect(helpText).toContain("ava supabase switch [project-id] [--no-seed]");
  });

  it("lists arguments and options from the command's own declarations", () => {
    const helpText = _makeHelpText(SWITCH_SPEC);

    expect(helpText).toMatch(/\[project-id\]\s+Project id\./);
    expect(helpText).toMatch(/--no-seed\s+Skip the seed\./);
    expect(helpText).toContain("-h, --help");
  });

  it("labels an option that takes a value with its alias and placeholder", () => {
    expect(_makeHelpText(SWITCH_REMOTE_SPEC)).toMatch(
      /-p, --project-id <ref>\s+Hosted project ref\./,
    );
  });

  it("lists the root's global options", () => {
    expect(_makeHelpText(SWITCH_SPEC)).toMatch(/--staging\s+Use staging\./);
  });

  it("lists each example with its description", () => {
    expect(_makeHelpText(SWITCH_SPEC)).toMatch(
      /ava supabase switch --no-seed\s+Leave it empty\./,
    );
  });
});
