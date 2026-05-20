import { describe, expect, it, vi } from "vitest";
import {
  buildHelpText,
  entryMatchesScope,
  parseArgs,
  parsePo,
  serializePo,
  translateBatch,
} from "./translateWithLLM";
import type { PoEntry } from "./translateWithLLM";
import type { Mock } from "vitest";

/**
 * vi.fn() doesn't include the static `preconnect` property that lives on
 * the lib.dom `fetch` type, so we need a tiny cast helper to satisfy the
 * `fetchImpl?: typeof fetch` parameter without losing the Mock methods
 * (mock.calls etc.) we want to assert against.
 */
function fetchMock(impl: Mock): Mock & typeof fetch {
  return impl as unknown as Mock & typeof fetch;
}

describe("parseArgs", () => {
  it("returns help=true for --help", () => {
    const result = parseArgs(["--help"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.options.help).toBe(true);
  });

  it("returns help=true for -h", () => {
    const result = parseArgs(["-h"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.options.help).toBe(true);
  });

  it("parses --all", () => {
    const result = parseArgs(["--all"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.all).toBe(true);
      expect(result.options.scopes).toEqual([]);
      expect(result.options.locales).toEqual([]);
    }
  });

  it("parses --scope with a space-separated value", () => {
    const result = parseArgs(["--scope", "WorkspaceSettingsPage"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.scopes).toEqual(["WorkspaceSettingsPage"]);
    }
  });

  it("parses --scope=foo equals form", () => {
    const result = parseArgs(["--scope=WorkspaceSettingsPage"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.scopes).toEqual(["WorkspaceSettingsPage"]);
    }
  });

  it("supports repeated --scope flags", () => {
    const result = parseArgs([
      "--scope",
      "WorkspaceSettingsPage",
      "--scope",
      "src/views/Dashboard",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.scopes).toEqual([
        "WorkspaceSettingsPage",
        "src/views/Dashboard",
      ]);
    }
  });

  it("supports comma-separated scopes within a single flag", () => {
    const result = parseArgs([
      "--scope",
      "WorkspaceSettingsPage, src/views/Dashboard ,,",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.scopes).toEqual([
        "WorkspaceSettingsPage",
        "src/views/Dashboard",
      ]);
    }
  });

  it("parses repeated --locale flags", () => {
    const result = parseArgs(["--locale", "es", "--locale", "fr"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.locales).toEqual(["es", "fr"]);
    }
  });

  it("parses comma-separated --locale values", () => {
    const result = parseArgs(["--locale", "es,fr,zh-Hans"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.locales).toEqual(["es", "fr", "zh-Hans"]);
    }
  });

  it("parses --model and --dry-run together", () => {
    const result = parseArgs(["--model", "gpt-4o", "--dry-run", "--all"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.model).toBe("gpt-4o");
      expect(result.options.dryRun).toBe(true);
      expect(result.options.all).toBe(true);
    }
  });

  it("rejects --scope with a missing value", () => {
    const result = parseArgs(["--scope"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/--scope/);
  });

  it("rejects --scope followed by another flag (no value)", () => {
    const result = parseArgs(["--scope", "--locale", "es"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/--scope/);
  });

  it("rejects --all combined with --scope", () => {
    const result = parseArgs(["--all", "--scope", "WorkspaceSettingsPage"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/--all/);
  });

  it("rejects --all combined with --locale", () => {
    const result = parseArgs(["--all", "--locale", "es"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/--all/);
  });

  it("rejects unknown flags", () => {
    const result = parseArgs(["--frobnicate"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unknown argument/);
  });
});

describe("buildHelpText", () => {
  it("documents every CLI flag", () => {
    const help = buildHelpText();
    expect(help).toContain("--help");
    expect(help).toContain("--all");
    expect(help).toContain("--scope");
    expect(help).toContain("--locale");
    expect(help).toContain("--model");
    expect(help).toContain("--dry-run");
  });

  it("mentions OPENAI_API_KEY and dotenv source files", () => {
    const help = buildHelpText();
    expect(help).toContain("OPENAI_API_KEY");
    expect(help).toContain(".env.development");
  });

  it("does not reference OpenRouter", () => {
    const help = buildHelpText();
    expect(help.toLowerCase()).not.toContain("openrouter");
  });
});

describe("parsePo + serializePo", () => {
  const samplePo = [
    'msgid ""',
    'msgstr ""',
    '"Content-Type: text/plain; charset=utf-8\\n"',
    '"Language: es\\n"',
    "",
    "#: src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx",
    'msgid "Workspace Name"',
    'msgstr ""',
    "",
    "#: src/views/Dashboard/Dashboard.tsx",
    'msgid "Dashboard"',
    'msgstr "Tablero"',
    "",
  ].join("\n");

  it("parses entries with their source-file references in the header", () => {
    const parsed = parsePo(samplePo);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]!.msgid).toBe("Workspace Name");
    expect(parsed.entries[0]!.msgstr).toBe("");
    expect(parsed.entries[0]!.header).toContain(
      "src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx",
    );
    expect(parsed.entries[1]!.msgid).toBe("Dashboard");
    expect(parsed.entries[1]!.msgstr).toBe("Tablero");
  });

  it("preserves the metadata preamble when round-tripping", () => {
    const parsed = parsePo(samplePo);
    expect(parsed.preamble).toContain("Language: es");
  });

  it("round-trips through serializePo with the msgstr updated", () => {
    const parsed = parsePo(samplePo);
    parsed.entries[0]!.msgstr = "Nombre del espacio";
    const out = serializePo(parsed);
    expect(out).toContain('msgstr "Nombre del espacio"');
    expect(out).toContain('msgstr "Tablero"');
    // The source-file reference comment must survive serialization.
    expect(out).toContain(
      "#: src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx",
    );
  });

  it("escapes quotes and newlines in msgstr values", () => {
    const parsed = parsePo(samplePo);
    parsed.entries[0]!.msgstr = 'He said "hi"\nNew line';
    const out = serializePo(parsed);
    expect(out).toContain('msgstr "He said \\"hi\\"\\nNew line"');
  });
});

describe("entryMatchesScope", () => {
  const entry: PoEntry = {
    header:
      "#: src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx\n" +
      "#: src/views/WorkspaceSettingsPage/WorkspaceLanguageTab/WorkspaceLanguageTab.tsx\n" +
      'msgid "Language"',
    msgid: "Language",
    msgstr: "",
  };

  it("returns true when scopes is empty (no filter)", () => {
    expect(entryMatchesScope(entry, [])).toBe(true);
  });

  it("matches a substring of the source-file reference", () => {
    expect(entryMatchesScope(entry, ["WorkspaceSettingsPage"])).toBe(true);
  });

  it("matches when any of multiple scopes matches", () => {
    expect(
      entryMatchesScope(entry, ["src/views/Dashboard", "WorkspaceLanguageTab"]),
    ).toBe(true);
  });

  it("returns false when no scope matches", () => {
    expect(entryMatchesScope(entry, ["src/views/Dashboard"])).toBe(false);
  });

  it("returns false on an entry that has no #: reference lines", () => {
    const noRef: PoEntry = {
      header: 'msgid "x"',
      msgid: "x",
      msgstr: "",
    };
    expect(entryMatchesScope(noRef, ["anything"])).toBe(false);
  });
});

describe("translateBatch", () => {
  const baseArgs = {
    locale: "es",
    localeLabel: "Spanish",
    entries: [
      { id: "m0", source: "Hello" },
      { id: "m1", source: "World" },
    ],
    apiKey: "test-key",
    model: "gpt-4o-mini",
  };

  it("calls the OpenAI Chat Completions endpoint with bearer auth", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({ m0: "Hola", m1: "Mundo" }),
              },
            },
          ],
        };
      },
    });

    const result = await translateBatch({
      ...baseArgs,
      fetchImpl: fetchMock(fetchImpl),
    });

    expect(result).toEqual({ m0: "Hola", m1: "Mundo" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    // Sanity-check: must not be hitting OpenRouter anymore.
    expect(url).not.toContain("openrouter");
    expect(headers).not.toHaveProperty("HTTP-Referer");
    expect(headers).not.toHaveProperty("X-Title");
  });

  it("sends the model, response_format=json_object, and the strings payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        return {
          choices: [
            { message: { content: JSON.stringify({ m0: "x", m1: "y" }) } },
          ],
        };
      },
    });

    await translateBatch({ ...baseArgs, fetchImpl: fetchMock(fetchImpl) });

    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      model: string;
      response_format: { type: string };
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.response_format).toEqual({ type: "json_object" });
    const userMessage = body.messages.find((m) => {
      return m.role === "user";
    });
    expect(userMessage).toBeDefined();
    const userPayload = JSON.parse(userMessage!.content) as {
      target_locale: string;
      strings: Array<{ id: string; source: string }>;
    };
    expect(userPayload.target_locale).toBe("es");
    expect(userPayload.strings).toEqual(baseArgs.entries);
  });

  it("throws a descriptive error when OpenAI returns a non-ok response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => {
        return "Unauthorized";
      },
    });

    await expect(
      translateBatch({ ...baseArgs, fetchImpl: fetchMock(fetchImpl) }),
    ).rejects.toThrow(/OpenAI request failed \(401\)/);
  });

  it("throws when the model returns non-JSON content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        return { choices: [{ message: { content: "not json at all" } }] };
      },
    });

    await expect(
      translateBatch({ ...baseArgs, fetchImpl: fetchMock(fetchImpl) }),
    ).rejects.toThrow(/Could not parse JSON/);
  });

  it("drops non-string values from the model response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({ m0: "Hola", m1: 42, m2: null }),
              },
            },
          ],
        };
      },
    });

    const result = await translateBatch({
      ...baseArgs,
      fetchImpl: fetchMock(fetchImpl),
    });
    expect(result).toEqual({ m0: "Hola" });
  });
});
