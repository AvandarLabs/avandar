import { describe, expect, it } from "vitest";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

const DETECTORS: SqlLiteralDetectors = {
  isSensitiveColumn: (columnName) => {
    return columnName === "name";
  },
  isSensitiveValue: () => {
    return false;
  },
};

describe("createSqlPlaceholderVault", () => {
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

  it("replaces every literal when the SQL cannot be parsed", () => {
    const vault = createSqlPlaceholderVault();

    expect(
      vault.redact(
        `SELECT "state" FROM t WHERE "state" = 'Texas' GROUP BY ALL`,
        DETECTORS,
      ),
    ).toBe(`SELECT "state" FROM t WHERE "state" = '<value 1>' GROUP BY ALL`);
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

  it("restores placeholders with their quotes escaped", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'O''Brien'`, DETECTORS);

    expect(
      vault.restore(`SELECT week, COUNT(*) FROM t WHERE "name" = '<value 1>'`),
    ).toBe(`SELECT week, COUNT(*) FROM t WHERE "name" = 'O''Brien'`);
  });

  it("leaves an unknown placeholder untouched", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'Ann'`, DETECTORS);

    expect(vault.restore(`SELECT * FROM t WHERE "name" = '<value 2>'`)).toBe(
      `SELECT * FROM t WHERE "name" = '<value 2>'`,
    );
  });

  it("restores only whole literals, not text inside identifiers", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'Ann'`, DETECTORS);

    expect(vault.restore(`SELECT "'<value 1>'" FROM t`)).toBe(
      `SELECT "'<value 1>'" FROM t`,
    );
  });

  it("names the placeholder of a value it holds", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT * FROM t WHERE "name" = 'Ann'`, DETECTORS);

    expect(vault.getPlaceholder("Ann")).toBe("<value 1>");
    expect(vault.getPlaceholder("Bo")).toBeUndefined();
  });
});
