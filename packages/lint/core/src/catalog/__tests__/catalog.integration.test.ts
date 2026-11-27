import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMarkdownFromRuleCatalog } from "../buildMarkdownFromRuleCatalog";
import { loadRuleCatalog } from "../loadRuleCatalog";
import { validateRuleCatalog } from "../validateRuleCatalog";

/** Canonical inventory, validation, and generated-reference contracts. */
describe("canonical catalog", () => {
  it("includes every inventory ID once with unique documentation slugs", () => {
    const catalog = loadRuleCatalog();
    const expected = Object.entries({
      common: 24,
      ts: 58,
      css: 1,
      sql: 7,
    }).flatMap(([namespace, count]) => {
      return Array.from({ length: count }, (_, index) => {
        return `avlint-${namespace}-${String(index + 1).padStart(3, "0")}`;
      });
    });
    expect(
      catalog.rules
        .map((rule) => {
          return rule.id;
        })
        .sort(),
    ).toEqual(expected.sort());
    expect(
      new Set(
        catalog.rules.map((rule) => {
          return rule.slug;
        }),
      ).size,
    ).toBe(expected.length);
    expect(
      catalog.rules
        .filter((rule) => {
          return rule.class !== "JR";
        })
        .every((rule) => {
          return rule.applicability.length > 0 && rule.phases.length > 0;
        }),
    ).toBe(true);
    expect(
      catalog.rules
        .filter((rule) => {
          return rule.class === "JR";
        })
        .every((rule) => {
          return rule.owner === "avandar-code-review";
        }),
    ).toBe(true);
  });

  it("rejects invalid data, duplicate IDs, and unowned judgment rules", () => {
    const catalog = loadRuleCatalog();
    expect(() => {
      return validateRuleCatalog({ ...catalog, unexpected: true });
    }).toThrow();
    expect(() => {
      return validateRuleCatalog({
        ...catalog,
        rules: [...catalog.rules, catalog.rules[0]],
      });
    }).toThrow(/unique/);
    expect(() => {
      return validateRuleCatalog({
        ...catalog,
        rules: [{ ...catalog.rules[0], phases: [] }],
      });
    }).toThrow();
    expect(() => {
      return validateRuleCatalog({
        ...catalog,
        rules: [{ ...catalog.rules.at(-1), owner: "lint" }],
      });
    }).toThrow();
  });

  it("rejects duplicate slugs even when rule IDs are unique", () => {
    const catalog = loadRuleCatalog();
    const firstRule = catalog.rules[0]!;
    const secondRule = catalog.rules[1]!;
    expect(() => {
      return validateRuleCatalog({
        ...catalog,
        rules: [firstRule, { ...secondRule, slug: firstRule.slug }],
      });
    }).toThrow("Catalog slug values must be unique");
  });

  it("rejects repair classes that disagree with deterministic rule classes", () => {
    const catalog = loadRuleCatalog();
    expect(() => {
      return validateRuleCatalog({
        ...catalog,
        rules: [{ ...catalog.rules[0], repair: "judgment" }],
      });
    }).toThrow();
  });

  it("rejects a language namespace that disagrees with applicability", () => {
    const catalog = loadRuleCatalog();
    const sqlRule = catalog.rules.find((rule) => {
      return rule.id === "avlint-sql-001";
    })!;
    expect(() => {
      return validateRuleCatalog({
        ...catalog,
        rules: [{ ...sqlRule, applicability: ["typescript"] }],
      });
    }).toThrow("Catalog namespace disagrees with avlint-sql-001");
  });

  it.each(["AF-01", "avlint-ts-1", "avlint-go-001"])(
    "rejects a rule ID outside the avlint namespaces: %s",
    (id) => {
      const catalog = loadRuleCatalog();
      expect(() => {
        return validateRuleCatalog({
          ...catalog,
          rules: [{ ...catalog.rules[0]!, id: id }],
        });
      }).toThrow();
    },
  );

  it("uses the inventory's exact source, TSX, and contextual judgment language gates", () => {
    const catalog = loadRuleCatalog();
    const applicability = (id: string): string[] => {
      return catalog.rules.find((rule) => {
        return rule.id === id;
      })!.applicability;
    };
    expect(applicability("avlint-common-007")).toEqual([
      "typescript",
      "javascript",
      "python",
      "rust",
      "go",
      "ruby",
      "java",
      "kotlin",
      "swift",
    ]);
    expect(applicability("avlint-ts-049")).toEqual(["typescript", "css"]);
    expect(applicability("avlint-ts-056")).toEqual([
      "typescript",
      "javascript",
    ]);
    expect(applicability("avlint-ts-057")).toEqual([
      "typescript",
      "javascript",
    ]);
    expect(applicability("avlint-sql-007")).toEqual(["sql"]);
    expect(applicability("avlint-ts-058")).toEqual([
      "typescript",
      "javascript",
      "css",
    ]);
  });

  it("keeps unenumerated judgment gates broad with contextual applicability guidance", () => {
    const catalog = loadRuleCatalog();
    const broad = catalog.rules.filter((rule) => {
      return (
        rule.class === "JR" &&
        ![
          "avlint-ts-056",
          "avlint-ts-057",
          "avlint-sql-007",
          "avlint-ts-058",
        ].includes(rule.id)
      );
    });
    expect(
      broad.every((rule) => {
        return rule.applicability.join() === catalog.languages.join();
      }),
    ).toBe(true);
    expect(
      broad.every((rule) => {
        return rule.boundary.includes(
          "Apply only when this judgment family is relevant",
        );
      }),
    ).toBe(true);
  });

  it("keeps the complete README catalog equal to deterministic rendering", () => {
    const readme = readFileSync(
      new URL("../../../../README.md", import.meta.url),
      "utf8",
    );
    expect(
      readme
        .split("<!-- catalog:start -->\n")[1]
        ?.split("\n<!-- catalog:end -->")[0],
    ).toBe(buildMarkdownFromRuleCatalog(loadRuleCatalog()));
  });
});
