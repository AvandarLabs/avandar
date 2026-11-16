import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { describe, expect, it } from "vitest";

const TTY_STREAM = { isTTY: true };
const PIPE_STREAM = { isTTY: false };

describe("CliTheme.isColorEnabled", () => {
  it("colors a terminal stream", () => {
    expect(CliTheme.isColorEnabled({ stream: TTY_STREAM, env: {} })).toBe(true);
  });

  it("stays plain when the stream is redirected", () => {
    expect(CliTheme.isColorEnabled({ stream: PIPE_STREAM, env: {} })).toBe(
      false,
    );
  });

  it("stays plain when NO_COLOR is set to anything", () => {
    expect(
      CliTheme.isColorEnabled({ stream: TTY_STREAM, env: { NO_COLOR: "1" } }),
    ).toBe(false);
  });

  it("stays plain on a dumb terminal", () => {
    expect(
      CliTheme.isColorEnabled({ stream: TTY_STREAM, env: { TERM: "dumb" } }),
    ).toBe(false);
  });
});

describe("CliTheme.paint", () => {
  it("wraps text in the style's escape codes when color is on", () => {
    expect(
      CliTheme.paint({ style: "success", text: "done", isColorEnabled: true }),
    ).toBe("\u001B[32mdone\u001B[0m");
  });

  it("returns the text untouched when color is off", () => {
    expect(
      CliTheme.paint({ style: "error", text: "broke", isColorEnabled: false }),
    ).toBe("broke");
  });
});

describe("CliTheme.makeErrorLines", () => {
  it("puts the fix on an indented warning line under the error", () => {
    expect(
      CliTheme.makeErrorLines({
        command: "ava supabase prune",
        message: "Docker is not running.",
        hint: "Start Colima with `colima start`, then retry.",
        isColorEnabled: false,
      }),
    ).toEqual([
      "❌ ava supabase prune: Docker is not running.",
      "  ⚠️ Start Colima with `colima start`, then retry.",
    ]);
  });
});
