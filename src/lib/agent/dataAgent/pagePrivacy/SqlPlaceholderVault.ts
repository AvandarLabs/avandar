import { findSensitiveSqlLiterals } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import { SqlStringLiterals } from "@/lib/agent/dataAgent/pagePrivacy/SqlStringLiterals";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

/** A placeholder's text inside its quotes, such as `<value 3>`. */
const PLACEHOLDER_VALUE = /^<value (\d+)>$/;

/**
 * Swaps personal values in SQL for numbered placeholders and back, for one
 * conversation with a hosted model. The model reads `'<value 1>'` where the
 * page SQL said `'Jane Doe'`, can keep that placeholder in the SQL it
 * writes, and the browser puts the value back before the SQL runs. The
 * values never leave the vault, which lives only in the browser.
 */
export type SqlPlaceholderVault = {
  /**
   * SQL with each literal that `detectors` flag (see
   * `findSensitiveSqlLiterals`) replaced by its placeholder. A value keeps
   * its number for the whole conversation.
   */
  redact: (sql: string, detectors: SqlLiteralDetectors) => string;
  /**
   * SQL with each known placeholder literal swapped back to its value. An
   * unknown placeholder is left as written, so the query fails visibly
   * instead of filtering on a guess.
   */
  restore: (sql: string) => string;
  /** The placeholder text (no quotes) a value has, if the vault holds it. */
  getPlaceholder: (value: string) => string | undefined;
};

/**
 * Creates an empty vault. Create one per conversation, so a value's
 * placeholder means the same thing in every turn the model remembers.
 */
export function createSqlPlaceholderVault(): SqlPlaceholderVault {
  const values: string[] = [];
  const numbersByValue = new Map<string, number>();

  const getOrAddNumber = (value: string): number => {
    const known = numbersByValue.get(value);
    if (known !== undefined) {
      return known;
    }
    values.push(value);
    numbersByValue.set(value, values.length);
    return values.length;
  };

  return {
    redact: (sql, detectors) => {
      const sensitive = findSensitiveSqlLiterals(sql, detectors);
      return SqlStringLiterals.replace(sql, (value) => {
        const isHidden =
          !PLACEHOLDER_VALUE.test(value) &&
          (sensitive === "all" || sensitive.has(value));
        return isHidden ? `'<value ${getOrAddNumber(value)}>'` : undefined;
      });
    },
    restore: (sql) => {
      return SqlStringLiterals.replace(sql, (literalValue) => {
        const number = PLACEHOLDER_VALUE.exec(literalValue)?.[1];
        const value = number === undefined ? undefined : values[+number - 1];
        return value === undefined ? undefined : SqlStringLiterals.quote(value);
      });
    },
    getPlaceholder: (value) => {
      const number = numbersByValue.get(value);
      return number === undefined ? undefined : `<value ${number}>`;
    },
  };
}
