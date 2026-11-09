import { describe, expect, it } from "vitest";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

const DETECTORS: SqlLiteralDetectors = {
  isSensitiveColumn: (columnName) => {
    return columnName === "name" || columnName === "patient_id";
  },
  isSensitiveValue: () => {
    return false;
  },
};

/** A vault holding `'Ann'` as `<value 1>` and `'O''Brien'` as `<value 2>`. */
function _vaultWithNames(): ReturnType<typeof createSqlPlaceholderVault> {
  const vault = createSqlPlaceholderVault();
  vault.redact(
    `SELECT * FROM t WHERE "name" IN ('Ann', 'O''Brien')`,
    DETECTORS,
  );
  return vault;
}

describe("createSqlPlaceholderVault redact", () => {
  it("replaces personal values with numbered placeholders", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT * FROM t WHERE "name" IN ('Ann', 'Bo') AND "state" = 'Texas'`,
        DETECTORS,
      ),
    ).toBe(
      `SELECT * FROM t WHERE "name" IN ('<value 1>', '<value 2>') AND "state" = 'Texas'`,
    );
  });

  it("keeps a value's number across calls and reuses it", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'Ann'`, DETECTORS);

    expect(
      vault.redact(`SELECT * FROM t WHERE "name" IN ('Bo', 'Ann')`, DETECTORS),
    ).toBe(`SELECT * FROM t WHERE "name" IN ('<value 2>', '<value 1>')`);
  });

  it("hides a value it holds wherever it appears again", () => {
    const vault = _vaultWithNames();

    expect(
      vault.redact(
        `SELECT * FROM t WHERE "nickname_of_x" = 'Ann' AND "state" = 'Texas'`,
        DETECTORS,
      ),
    ).toBe(
      `SELECT * FROM t WHERE "nickname_of_x" = '<value 1>' AND "state" = 'Texas'`,
    );
  });

  it("hides numbers compared with a personal column", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT * FROM t WHERE "patient_id" = 48213 LIMIT 10`,
        DETECTORS,
      ),
    ).toBe(`SELECT * FROM t WHERE "patient_id" = '<value 1>' LIMIT 10`);
  });

  it("replaces every string and larger number when the SQL cannot be parsed", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT "state" FROM t WHERE "state" = 'Texas' AND "id" = 48213 GROUP BY ALL LIMIT 10`,
        DETECTORS,
      ),
    ).toBe(
      `SELECT "state" FROM t WHERE "state" = '<value 1>' AND "id" = '<value 2>' GROUP BY ALL LIMIT 10`,
    );
  });

  it("replaces E'' and dollar-quoted strings", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT * FROM t WHERE "name" = E'O\\'Brien' OR "name" = $$Jane$$`,
        DETECTORS,
      ),
    ).toBe(
      `SELECT * FROM t WHERE "name" = '<value 1>' OR "name" = '<value 2>'`,
    );
  });

  it("drops comments, which can hold values", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(`SELECT 1 -- Jane Doe\nFROM t /* Ann */`, DETECTORS),
    ).toBe(`SELECT 1  \nFROM t  `);
  });

  it("leaves a placeholder already in the SQL as it is", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT 1 FROM t WHERE x = '<value 7>' GROUP BY ALL`,
        DETECTORS,
      ),
    ).toBe(`SELECT 1 FROM t WHERE x = '<value 7>' GROUP BY ALL`);
  });

  it("reads only canonical placeholders as placeholders", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT 1 FROM t WHERE "name" IN ('<value 01>', '<value 0>') GROUP BY ALL`,
        DETECTORS,
      ),
    ).toBe(
      `SELECT 1 FROM t WHERE "name" IN ('<value 1>', '<value 2>') GROUP BY ALL`,
    );
  });
});

describe("createSqlPlaceholderVault restore", () => {
  it("restores placeholders with their quotes escaped", () => {
    expect(
      _vaultWithNames().restore(
        `SELECT week FROM t WHERE "name" IN ('<value 1>', '<value 2>')`,
      ),
    ).toBe(`SELECT week FROM t WHERE "name" IN ('Ann', 'O''Brien')`);
  });

  it("restores a number unquoted", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "patient_id" = 48213`, DETECTORS);

    expect(
      vault.restore(`SELECT * FROM t WHERE "patient_id" = '<value 1>'`),
    ).toBe(`SELECT * FROM t WHERE "patient_id" = 48213`);
  });

  it("restores an E'' string as written", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = E'O\\'Brien'`, DETECTORS);

    expect(vault.restore(`SELECT '<value 1>'`)).toBe(`SELECT E'O\\'Brien'`);
  });

  it("leaves an unknown placeholder untouched", () => {
    expect(
      _vaultWithNames().restore(`SELECT * FROM t WHERE "name" = '<value 3>'`),
    ).toBe(`SELECT * FROM t WHERE "name" = '<value 3>'`);
  });

  it("restores only whole literals, not text inside identifiers", () => {
    expect(_vaultWithNames().restore(`SELECT "'<value 1>'" FROM t`)).toBe(
      `SELECT "'<value 1>'" FROM t`,
    );
  });
});

describe("createSqlPlaceholderVault getPlaceholderError", () => {
  it("accepts held placeholders used as whole values", () => {
    expect(
      _vaultWithNames().getPlaceholderError(
        `SELECT * FROM t WHERE "name" = '<value 1>'`,
      ),
    ).toBeUndefined();
  });

  it("names an unknown placeholder", () => {
    expect(_vaultWithNames().getPlaceholderError(`SELECT '<value 9>'`)).toMatch(
      /<value 9> is an unknown placeholder/,
    );
  });

  it.each([
    `SELECT '<value 1> and more'`,
    `SELECT * FROM t WHERE x LIKE '%<value 2>%'`,
  ])("rejects a placeholder inside a larger value: %s", (sql) => {
    expect(_vaultWithNames().getPlaceholderError(sql)).toMatch(
      /must be used as a whole quoted value/,
    );
  });
});

describe("createSqlPlaceholderVault maskText", () => {
  it("masks detected values bare and quoted, ignoring case", () => {
    const vault = _vaultWithNames();

    expect(
      vault.maskText(`count_star() FILTER (WHERE (name = 'Ann')) for ANN`),
    ).toBe(`count_star() FILTER (WHERE (name = '<value 1>')) for <value 1>`);
    expect(vault.maskText(`Visits by O'Brien`)).toBe(`Visits by <value 2>`);
  });

  it("masks only whole words, by Unicode letters and digits", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'José'`, DETECTORS);

    expect(vault.maskText(`José, Josefa, Josél, José_x, ¿José?`)).toBe(
      `<value 1>, Josefa, Josél, José_x, ¿<value 1>?`,
    );
  });

  it("strips LIKE wildcards before masking bare text", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" LIKE '%Doe%'`, DETECTORS);

    expect(vault.maskText(`Visits by Jane Doe`)).toBe(
      `Visits by Jane <value 1>`,
    );
  });

  it("masks values held only because the SQL could not be read, quoted only", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(
      `SELECT date_trunc('month', "date") FROM t GROUP BY ALL`,
      DETECTORS,
    );

    expect(vault.maskText(`Deaths by month: date_trunc('month', date)`)).toBe(
      `Deaths by month: date_trunc('<value 1>', date)`,
    );
  });

  it("never masks inside a placeholder", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'value'`, DETECTORS);

    expect(vault.maskText(`<value 1> and value`)).toBe(
      `<value 1> and <value 1>`,
    );
  });
});

describe("createSqlPlaceholderVault lookups", () => {
  it("names the placeholder of a value it holds", () => {
    const vault = _vaultWithNames();

    expect(vault.getPlaceholder("Ann")).toBe("<value 1>");
    expect(vault.getPlaceholder("Bo")).toBeUndefined();
  });

  it("knows which placeholders it holds", () => {
    const vault = _vaultWithNames();

    expect(vault.isHeldPlaceholder("<value 2>")).toBe(true);
    expect(vault.isHeldPlaceholder("<value 3>")).toBe(false);
    expect(vault.isHeldPlaceholder("<value 02>")).toBe(false);
  });
});
