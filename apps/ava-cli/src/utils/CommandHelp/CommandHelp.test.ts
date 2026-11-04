import { CommandHelp } from "@ava-cli/utils/CommandHelp/CommandHelp";
import { describe, expect, it } from "vitest";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const SWITCH_SPEC: CommandHelpSpec = {
  commandPath: ["supabase", "switch"],
  summary: "Start an isolated local Supabase project for this branch.",
  usage: ["ava supabase switch [project-id] [base-port] [--no-seed]"],
  arguments: [{ label: "[project-id]", description: "Project id." }],
  options: [{ label: "--no-seed", description: "Skip the seed." }],
  examples: [
    { label: "ava supabase switch", description: "Switch this branch." },
    { label: "ava supabase switch --no-seed", description: "Leave it empty." },
  ],
};

const SWITCH_REMOTE_SPEC: CommandHelpSpec = {
  commandPath: ["supabase", "switch", "remote"],
  summary: "Point this worktree at a hosted Supabase project.",
  usage: ["ava supabase switch remote [--project-id <id>]"],
  options: [
    { label: "--project-id <id>", description: "Hosted project ref." },
    { label: "-y, --yes", description: "Skip the confirmation." },
  ],
  examples: [
    { label: "ava supabase switch remote", description: "Answer prompts." },
    { label: "ava supabase switch remote --project-id abc", description: "x" },
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

describe("CommandHelp.wantsHelp", () => {
  it("recognises both help spellings anywhere in argv", () => {
    expect(
      [
        ["supabase", "prune", "--help"],
        ["supabase", "prune", "-h"],
        ["supabase", "prune", "--all"],
      ].map(CommandHelp.wantsHelp),
    ).toEqual([true, true, false]);
  });
});

describe("CommandHelp.findUnknownFlags", () => {
  it("accepts declared flags, their aliases, and the global ones", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "remote", "-y", "--project-id", "a"],
        spec: SWITCH_REMOTE_SPEC,
        globalFlags: ["--staging"],
      }),
    ).toEqual([]);
  });

  it("returns a flag the command does not declare", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "--noseed"],
        spec: SWITCH_SPEC,
        globalFlags: [],
      }),
    ).toEqual(["--noseed"]);
  });

  it("checks only the flag half of a --flag=value token", () => {
    expect(
      CommandHelp.findUnknownFlags({
        argv: ["supabase", "switch", "remote", "--project-id=abc"],
        spec: SWITCH_REMOTE_SPEC,
        globalFlags: [],
      }),
    ).toEqual([]);
  });
});

describe("CommandHelp.makeHelpLines", () => {
  it("lists the summary, usage, every option, and the examples", () => {
    const helpText = CommandHelp.makeHelpLines({
      spec: SWITCH_SPEC,
      globalOptions: [{ label: "--staging", description: "Use staging." }],
      isColorEnabled: false,
    }).join("\n");

    expect(helpText).toContain(
      "Start an isolated local Supabase project for this branch.",
    );
    expect(helpText).toContain(
      "ava supabase switch [project-id] [base-port] [--no-seed]",
    );
    expect(helpText).toContain("--no-seed");
    expect(helpText).toContain("-h, --help");
    expect(helpText).toContain("--staging");
    expect(helpText).toContain("ava supabase switch --no-seed");
  });
});
