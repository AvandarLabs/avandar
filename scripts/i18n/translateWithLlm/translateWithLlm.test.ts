import type { PoEntry } from "./translateWithLlm";
import type { Mock } from "vitest";

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { LOCALES_DIR, PROJECT_ROOT, SOURCE_LOCALE } from "./config";
import {
  CatalogTranslator,
  PoCatalog,
  TranslationCli,
} from "./translateWithLlm";

/**
 * vi.fn() doesn't include the static `preconnect` property that lives on
 * the lib.dom `fetch` type, so we need a tiny cast helper to satisfy the
 * `fetchImpl?: typeof fetch` parameter without losing the Mock methods
 * (mock.calls etc.) we want to assert against.
 */
function _createFetchMock(impl: Mock): Mock & typeof fetch {
  return impl as unknown as Mock & typeof fetch;
}

describe("config paths", () => {
  // These paths are computed by walking up from this module's own directory,
  // so a move or rename silently points them at the wrong tree. Assert against
  // the real repo layout instead of recomputing the same path math here.
  it("resolves PROJECT_ROOT to the repo root", () => {
    expect(existsSync(path.join(PROJECT_ROOT, "lingui.config.ts"))).toBe(true);
  });

  it("resolves LOCALES_DIR to the source locale catalog", () => {
    expect(
      existsSync(path.join(LOCALES_DIR, SOURCE_LOCALE, "messages.po")),
    ).toBe(true);
  });
});

describe("parseArgs", () => {
  it("returns help=true for --help", () => {
    const result = TranslationCli.parseArgs(["--help"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.help).toBe(true);
    }
  });

  it("returns help=true for -h", () => {
    const result = TranslationCli.parseArgs(["-h"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.help).toBe(true);
    }
  });

  it("parses --all", () => {
    const result = TranslationCli.parseArgs(["--all"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.all).toBe(true);
      expect(result.options.scopes).toEqual([]);
      expect(result.options.locales).toEqual([]);
    }
  });

  it("parses --scope with a space-separated value", () => {
    const result = TranslationCli.parseArgs([
      "--scope",
      "WorkspaceSettingsPage",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.scopes).toEqual(["WorkspaceSettingsPage"]);
    }
  });

  it("parses --scope=foo equals form", () => {
    const result = TranslationCli.parseArgs(["--scope=WorkspaceSettingsPage"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.scopes).toEqual(["WorkspaceSettingsPage"]);
    }
  });

  it("supports repeated --scope flags", () => {
    const result = TranslationCli.parseArgs([
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
    const result = TranslationCli.parseArgs([
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
    const result = TranslationCli.parseArgs([
      "--locale",
      "es",
      "--locale",
      "fr",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.locales).toEqual(["es", "fr"]);
    }
  });

  it("parses comma-separated --locale values", () => {
    const result = TranslationCli.parseArgs(["--locale", "es,fr,zh-Hans"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.locales).toEqual(["es", "fr", "zh-Hans"]);
    }
  });

  it("parses --model and --dry-run together", () => {
    const result = TranslationCli.parseArgs([
      "--model",
      "gpt-4o",
      "--dry-run",
      "--all",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.model).toBe("gpt-4o");
      expect(result.options.dryRun).toBe(true);
      expect(result.options.all).toBe(true);
    }
  });

  it("rejects --scope with a missing value", () => {
    const result = TranslationCli.parseArgs(["--scope"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/--scope/);
    }
  });

  it("rejects --scope followed by another flag (no value)", () => {
    const result = TranslationCli.parseArgs(["--scope", "--locale", "es"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/--scope/);
    }
  });

  it("rejects --all combined with --scope", () => {
    const result = TranslationCli.parseArgs([
      "--all",
      "--scope",
      "WorkspaceSettingsPage",
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/--all/);
    }
  });

  it("rejects --all combined with --locale", () => {
    const result = TranslationCli.parseArgs(["--all", "--locale", "es"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/--all/);
    }
  });

  it("rejects unknown flags", () => {
    const result = TranslationCli.parseArgs(["--frobnicate"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Unknown argument/);
    }
  });
});

describe("buildHelpText", () => {
  it("documents every CLI flag", () => {
    const help = TranslationCli.buildHelpText();
    expect(help).toContain("--help");
    expect(help).toContain("--all");
    expect(help).toContain("--scope");
    expect(help).toContain("--locale");
    expect(help).toContain("--model");
    expect(help).toContain("--dry-run");
  });

  it("mentions OPENAI_API_KEY and dotenv source files", () => {
    const help = TranslationCli.buildHelpText();
    expect(help).toContain("OPENAI_API_KEY");
    expect(help).toContain(".env.development");
  });

  it("does not reference OpenRouter", () => {
    const help = TranslationCli.buildHelpText();
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
    const parsed = PoCatalog.parse(samplePo);
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
    const parsed = PoCatalog.parse(samplePo);
    expect(parsed.preamble).toContain("Language: es");
  });

  it("round-trips through serializePo with the msgstr updated", () => {
    const parsed = PoCatalog.parse(samplePo);
    parsed.entries[0]!.msgstr = "Nombre del espacio";
    const out = PoCatalog.serialize(parsed);
    expect(out).toContain('msgstr "Nombre del espacio"');
    expect(out).toContain('msgstr "Tablero"');
    // The source-file reference comment must survive serialization.
    expect(out).toContain(
      "#: src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx",
    );
  });

  it("escapes quotes and newlines in msgstr values", () => {
    const parsed = PoCatalog.parse(samplePo);
    parsed.entries[0]!.msgstr = 'He said "hi"\nNew line';
    const out = PoCatalog.serialize(parsed);
    expect(out).toContain('msgstr "He said \\"hi\\"\\nNew line"');
  });

  it("emits exactly one blank line between the preamble and first entry", () => {
    // Regression: a parse → serialize round-trip used to fold the consumed
    // separator blank line back into the preamble AND re-add it via
    // join("\n\n"), producing a double blank line. Lingui's formatter then
    // stripped the extra on the next `lingui extract`, yielding a spurious
    // newline-only diff in every catalog. See translateWithLlm.ts parsePo.
    const out = PoCatalog.serialize(PoCatalog.parse(samplePo));
    expect(out).toContain('"Language: es\\n"\n\n#: src/views');
    expect(out).not.toContain('"Language: es\\n"\n\n\n');
  });

  it("normalizes a malformed double blank line back to a single one", () => {
    const malformed = [
      'msgid ""',
      'msgstr ""',
      '"Language: es\\n"',
      "",
      "",
      "#: src/views/Dashboard/Dashboard.tsx",
      'msgid "Dashboard"',
      'msgstr "Tablero"',
      "",
    ].join("\n");
    const out = PoCatalog.serialize(PoCatalog.parse(malformed));
    expect(out).not.toContain("\n\n\n");
    expect(out).toContain('"Language: es\\n"\n\n#: src/views');
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
    expect(PoCatalog.entryMatchesScope(entry, [])).toBe(true);
  });

  it("matches a substring of the source-file reference", () => {
    expect(PoCatalog.entryMatchesScope(entry, ["WorkspaceSettingsPage"])).toBe(
      true,
    );
  });

  it("matches when any of multiple scopes matches", () => {
    expect(
      PoCatalog.entryMatchesScope(entry, [
        "src/views/Dashboard",
        "WorkspaceLanguageTab",
      ]),
    ).toBe(true);
  });

  it("returns false when no scope matches", () => {
    expect(PoCatalog.entryMatchesScope(entry, ["src/views/Dashboard"])).toBe(
      false,
    );
  });

  it("returns false on an entry that has no #: reference lines", () => {
    const noRef: PoEntry = {
      header: 'msgid "x"',
      msgid: "x",
      msgstr: "",
    };
    expect(PoCatalog.entryMatchesScope(noRef, ["anything"])).toBe(false);
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

    const result = await CatalogTranslator.translateBatch({
      ...baseArgs,
      fetchImpl: _createFetchMock(fetchImpl),
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

    await CatalogTranslator.translateBatch({
      ...baseArgs,
      fetchImpl: _createFetchMock(fetchImpl),
    });

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
      CatalogTranslator.translateBatch({
        ...baseArgs,
        fetchImpl: _createFetchMock(fetchImpl),
      }),
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
      CatalogTranslator.translateBatch({
        ...baseArgs,
        fetchImpl: _createFetchMock(fetchImpl),
      }),
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

    const result = await CatalogTranslator.translateBatch({
      ...baseArgs,
      fetchImpl: _createFetchMock(fetchImpl),
    });
    expect(result).toEqual({ m0: "Hola" });
  });
});
