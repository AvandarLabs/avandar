/**
 * Deterministic fixes for common small-model SQL mistakes before parsing.
 * Each rule is applied in order; rules should be idempotent or guarded.
 */

export type OfflineSqlSubstitutionRule = {
  /** Short label stored in repair diagnostics. */
  id: string;
  apply: (sql: string) => string;
};

const FORBIDDEN_TABLE_NAMES = [
  "pg_database",
  "pg_catalog",
  "information_schema",
  "sqlite_master",
  "duckdb_tables",
  "duckdb_columns",
] as const;

function buildForbiddenTablePattern(): RegExp {
  const names = FORBIDDEN_TABLE_NAMES.join("|");
  return new RegExp(
    `\\b(?:FROM|JOIN)\\s+(?:"|')?(?:${names})(?:"|')?\\b`,
    "gi",
  );
}

/**
 * Avandar SQL uses double-quoted identifiers; models often emit backticks.
 */
export function normalizeBacktickIdentifiers(sql: string): string {
  return sql.replace(/`([^`]+)`/g, '"$1"');
}

/**
 * Converts T-SQL `SELECT TOP n` into DuckDB `LIMIT n` (parser + runtime).
 */
export function normalizeSelectTopToLimit(sql: string): string {
  const topMatch = /\bSELECT\s+TOP\s+(\d+)\b/i.exec(sql);
  if (!topMatch?.[1]) {
    return sql.trim();
  }
  let out = sql.replace(/\bSELECT\s+TOP\s+\d+\s+/i, "SELECT ");
  if (!/\bLIMIT\s+\d+/i.test(out)) {
    out = `${out.replace(/;\s*$/, "").trim()} LIMIT ${topMatch[1]}`;
  }
  return out.trim();
}

/**
 * Quotes a bare identifier after FROM/JOIN so node-sql-parser can read it.
 */
export function quoteUnquotedFromTable(sql: string): string {
  return sql.replace(
    /\b(FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_.-]*)\b(?!\s*\()/gi,
    (match, keyword: string, table: string) => {
      if (table.startsWith('"') || table.includes(".")) {
        return match;
      }
      return `${keyword} "${table}"`;
    },
  );
}

const SUBSTITUTION_RULES: readonly OfflineSqlSubstitutionRule[] = [
  {
    id: "normalize_backtick_identifiers",
    apply: normalizeBacktickIdentifiers,
  },
  {
    id: "normalize_select_top",
    apply: normalizeSelectTopToLimit,
  },
  {
    id: "strip_trailing_semicolon",
    apply: (sql) => {
      return sql.replace(/;\s*$/, "").trim();
    },
  },
  {
    id: "quote_unqualified_from",
    apply: quoteUnquotedFromTable,
  },
  {
    id: "remove_forbidden_system_tables",
    apply: (sql) => {
      return sql.replace(
        buildForbiddenTablePattern(),
        'FROM "__FORBIDDEN_TABLE_REMOVED__"',
      );
    },
  },
];

/**
 * Applies the hallucination substitution dictionary in a stable order.
 */
export function applyOfflineSqlHallucinationSubstitutions(sql: string): {
  sql: string;
  appliedRuleIds: string[];
} {
  const appliedRuleIds: string[] = [];
  let current = sql.trim();
  for (const rule of SUBSTITUTION_RULES) {
    const next = rule.apply(current);
    if (next !== current) {
      appliedRuleIds.push(rule.id);
      current = next;
    }
  }
  return { sql: current, appliedRuleIds };
}
