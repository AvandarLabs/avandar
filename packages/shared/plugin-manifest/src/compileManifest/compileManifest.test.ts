import { compileManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError/PluginManifestError.ts";
import { describe, expect, it } from "vitest";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";

const VALID_YAML = `
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
`;

const LOCALES = {
  en: {
    "plugin.name": "Epidemiology",
    "plugin.description": "Statistical tools.",
    "regression.linear.title": "Linear regression",
    "regression.unused": "Not referenced by the manifest",
  },
  es: { "plugin.name": "Epidemiología" },
};

function _compile(yamlText: string, locales: PluginLocaleMessages = LOCALES) {
  return compileManifest({
    yamlText,
    sourcePath: "plugins/epi/ava.yaml",
    locales,
  });
}

/**
 * Locale files come from `JSON.parse`, so at runtime they can hold anything.
 * This builds the malformed shapes the type system otherwise forbids.
 */
function _asLocales(value: unknown): PluginLocaleMessages {
  return value as PluginLocaleMessages;
}

function _getIssues(run: () => unknown): readonly string[] {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginManifestError);
    return (error as PluginManifestError).issues;
  }
  return expect.unreachable();
}

const VIZ_YAML = `${VALID_YAML}  vizTypes:
    - id: epicurve
      title: "%viz.title%"
      icon: chart-histogram
      render: transform
      settings:
        - key: interval
          label: "%viz.interval%"
          control:
            kind: segmented
            options:
              - { value: day, label: "%viz.interval.day%" }
              - { value: week, label: "%viz.interval.week%" }
        - key: windowSize
          label: "%viz.windowSize%"
          control: { kind: number, unit: "%viz.windowSize.unit%" }
        - key: caption
          label: "%viz.caption%"
          control: { kind: text, placeholder: "%viz.caption.placeholder%" }
`;

const VIZ_EN_MESSAGES: Record<string, string> = {
  ...LOCALES.en,
  "viz.title": "Epidemic curve",
  "viz.interval": "Interval",
  "viz.interval.day": "Day",
  "viz.interval.week": "Week",
  "viz.windowSize": "Window",
  "viz.windowSize.unit": "days",
  "viz.caption": "Caption",
  "viz.caption.placeholder": "Add a caption",
};

function _omitVizMessage(key: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(VIZ_EN_MESSAGES).filter(([candidateKey]) => {
      return candidateKey !== key;
    }),
  );
}

describe("compileManifest", () => {
  it("returns the manifest and only the strings it references", () => {
    const { manifest, strings } = _compile(VALID_YAML);
    expect(manifest.id).toBe("avandar.epidemiology");
    expect(strings.en).toEqual({
      "plugin.name": "Epidemiology",
      "plugin.description": "Statistical tools.",
      "regression.linear.title": "Linear regression",
    });
    expect(strings.es).toEqual({ "plugin.name": "Epidemiología" });
  });

  it("rejects an unquoted version that YAML parses as a number", () => {
    expect(() => {
      return _compile(VALID_YAML.replace('version: "0.1.0"', "version: 1.10"));
    }).toThrow(/quoted semver/);
  });

  it("keeps a NO country code as a string under YAML 1.2", () => {
    const yamlText = VALID_YAML.replace("license: MIT", "license: NO");
    expect(_compile(yamlText).manifest.license).toBe("NO");
  });

  it("rejects YAML aliases before schema validation", () => {
    // The alias sits in an otherwise valid manifest, so only the alias guard
    // can make this throw. The message names aliasing, not a schema issue.
    const yamlText = VALID_YAML.replace(
      'engines:\n  avandar: "^1"',
      'engines:\n  avandar: &range "^1"',
    ).replace("license: MIT", "license: *range");
    expect(() => {
      return _compile(yamlText);
    }).toThrow(/alias/i);
  });

  it("reports a missing English string", () => {
    expect(() => {
      return _compile(VALID_YAML, { en: { "plugin.name": "Epidemiology" } });
    }).toThrow(
      /"plugin.description" is referenced but missing from locales\/en.json/,
    );
  });

  it("requires locales/en.json", () => {
    expect(() => {
      return _compile(VALID_YAML, { es: LOCALES.es });
    }).toThrow(/locales\/en.json is required/);
  });

  it("lists every schema issue with its path", () => {
    try {
      _compile(VALID_YAML.replace("id: avandar.epidemiology", "id: Bad"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginManifestError);
      expect((error as PluginManifestError).issues[0]).toMatch(/^id: /);
    }
  });

  describe("locale values", () => {
    it("rejects a non-string value for a referenced key in en", () => {
      const locales = _asLocales({ en: { ...LOCALES.en, "plugin.name": 42 } });
      expect(
        _getIssues(() => {
          return _compile(VALID_YAML, locales);
        }),
      ).toEqual(['"plugin.name" in locales/en.json must be a string']);
    });

    it("rejects a non-string value for a referenced key in another locale", () => {
      const locales = _asLocales({ en: LOCALES.en, es: { "plugin.name": 42 } });
      expect(
        _getIssues(() => {
          return _compile(VALID_YAML, locales);
        }),
      ).toEqual(['"plugin.name" in locales/es.json must be a string']);
    });

    it("ignores a non-string value for a key nothing references", () => {
      const locales = _asLocales({
        en: { ...LOCALES.en, "regression.unused": 42 },
      });
      expect(_compile(VALID_YAML, locales).strings.en).not.toHaveProperty(
        "regression.unused",
      );
    });

    it("rejects a null en as an error, not a TypeError", () => {
      expect(
        _getIssues(() => {
          return _compile(VALID_YAML, _asLocales({ en: null }));
        }),
      ).toEqual([
        "locales/en.json must be a JSON object of message keys to strings",
      ]);
    });

    it.each([
      ["an array", []],
      ["a string", "Epidemiology"],
      ["a number", 7],
    ])("rejects an en that is %s", (_label, en) => {
      expect(
        _getIssues(() => {
          return _compile(VALID_YAML, _asLocales({ en }));
        }),
      ).toEqual([
        "locales/en.json must be a JSON object of message keys to strings",
      ]);
    });

    it("rejects another locale that is not an object", () => {
      const locales = _asLocales({ en: LOCALES.en, es: null });
      expect(
        _getIssues(() => {
          return _compile(VALID_YAML, locales);
        }),
      ).toEqual([
        "locales/es.json must be a JSON object of message keys to strings",
      ]);
    });

    it("reports every locale problem together", () => {
      const locales = _asLocales({
        en: { ...LOCALES.en, "plugin.name": 42 },
        es: null,
        fr: { "plugin.description": false },
      });
      expect(
        _getIssues(() => {
          return _compile(VALID_YAML, locales);
        }),
      ).toEqual([
        "locales/es.json must be a JSON object of message keys to strings",
        '"plugin.name" in locales/en.json must be a string',
        '"plugin.description" in locales/fr.json must be a string',
      ]);
    });

    it("does not treat an inherited property as a present key", () => {
      const yamlText = VALID_YAML.replace(
        'description: "%plugin.description%"',
        'description: "%toString%"',
      );
      expect(
        _getIssues(() => {
          return _compile(yamlText);
        }),
      ).toEqual(['"toString" is referenced but missing from locales/en.json']);
    });
  });

  it("reports a key referenced twice only once", () => {
    const yamlText = VALID_YAML.replace(
      'description: "%plugin.description%"',
      'description: "%plugin.name%"',
    );
    expect(
      _getIssues(() => {
        return _compile(yamlText, { en: { "regression.linear.title": "x" } });
      }),
    ).toEqual(['"plugin.name" is referenced but missing from locales/en.json']);
  });

  it("treats a YAML warning as an error", () => {
    const issues = _getIssues(() => {
      return _compile(VALID_YAML.replace("license: MIT", "license: !foo MIT"));
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/Unresolved tag/);
  });

  it.each([
    ["an empty file", ""],
    ["only a comment", "# nothing here\n"],
  ])("rejects %s", (_label, yamlText) => {
    expect(
      _getIssues(() => {
        return _compile(yamlText);
      }),
    ).toEqual(["ava.yaml is empty"]);
  });

  describe("viz type strings", () => {
    it.each([
      ["title", "viz.title"],
      ["setting label", "viz.windowSize"],
      ["option label", "viz.interval.week"],
      ["number unit", "viz.windowSize.unit"],
      ["text placeholder", "viz.caption.placeholder"],
    ])("requires a viz type's %s in locales/en.json", (_label, key) => {
      expect(
        _getIssues(() => {
          return _compile(VIZ_YAML, { en: _omitVizMessage(key) });
        }),
      ).toEqual([`"${key}" is referenced but missing from locales/en.json`]);
    });

    it("keeps every viz type string in the compiled strings", () => {
      const { strings } = _compile(VIZ_YAML, { en: VIZ_EN_MESSAGES });
      expect(strings.en).toEqual({
        "plugin.name": "Epidemiology",
        "plugin.description": "Statistical tools.",
        "regression.linear.title": "Linear regression",
        "viz.title": "Epidemic curve",
        "viz.interval": "Interval",
        "viz.interval.day": "Day",
        "viz.interval.week": "Week",
        "viz.windowSize": "Window",
        "viz.windowSize.unit": "days",
        "viz.caption": "Caption",
        "viz.caption.placeholder": "Add a caption",
      });
    });
  });
});
