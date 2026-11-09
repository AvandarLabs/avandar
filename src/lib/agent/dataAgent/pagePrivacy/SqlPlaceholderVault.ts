import { SqlLiterals } from "$/agent/pageContext/SqlLiterals";
import { findSensitiveSqlLiterals } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import type { SqlLiteral } from "$/agent/pageContext/SqlLiterals";
import type {
  SensitiveSqlLiterals,
  SqlLiteralDetectors,
} from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

/** A placeholder's text inside its quotes, such as `<value 3>`. */
const PLACEHOLDER_VALUE = /^<value ([1-9]\d*)>$/;

/**
 * Anything a model may have meant as a placeholder: any case, spacing, or
 * leading zeros, as in `<VALUE 01>`.
 */
const PLACEHOLDER_LIKE = /<\s*value\s*\d+\s*>/i;

/**
 * In SQL that could not be read, numbers this small stay as written when
 * no identifier names a personal column: they are column positions
 * (`GROUP BY 1`), limits, and months, not people.
 */
const MAX_KEPT_NUMBER_WHEN_UNREAD = 99;

/** The shortest bare value masking looks for in free text. */
const MIN_MASKED_BARE_LENGTH = 2;

/**
 * Why a value is held. `compared`: a detector found it tested against a
 * personal column's value, or it looks personal itself. `swept`: it was
 * elsewhere in an expression that reads a personal column. `unread`: its
 * SQL could not be parsed, so every literal was hidden. Only `compared`
 * values are masked as words in page text such as chart titles.
 */
type HoldReason = "compared" | "swept" | "unread";

/** How strongly each reason claims a value, so a value keeps the strongest. */
const REASON_RANK: Record<HoldReason, number> = {
  unread: 0,
  swept: 1,
  compared: 2,
};

type HeldValue = SqlLiteral & { placeholder: string; reason: HoldReason };

/** Which held values `maskText` and `maskResultText` match as bare words. */
type MaskScope = "page" | "result";

/**
 * Swaps personal values in SQL for numbered placeholders and back, for one
 * conversation with a hosted model. The model reads `'<value 1>'` where the
 * page SQL said `'Jane Doe'`, can keep that placeholder in the SQL it
 * writes, and the browser puts the value back before the SQL runs. The
 * values never leave the vault, which lives only in the browser.
 *
 * A number's placeholder is quoted like a string's in the SQL the model
 * reads; restoring writes the number back unquoted, exactly as first seen.
 */
export type SqlPlaceholderVault = {
  /**
   * SQL without comments, with each literal that `detectors` flag (see
   * `findSensitiveSqlLiterals`) or that the vault already holds replaced by
   * its placeholder. A value keeps its number for the whole conversation.
   */
  redact: (sql: string, detectors: SqlLiteralDetectors) => string;
  /**
   * SQL with each known placeholder literal swapped back to its value. An
   * unknown placeholder is left as written.
   */
  restore: (sql: string) => string;
  /**
   * Why SQL from the model cannot run as written, in words for the model:
   * an unknown placeholder, or one not written exactly as a whole
   * single-quoted value. Undefined when every placeholder is fine.
   */
  getPlaceholderError: (sql: string) => string | undefined;
  /**
   * Page text (chart titles, page names, result column names) with held
   * values swapped for their placeholders: each value as a quoted SQL
   * literal, and each compared value as a whole word, ignoring case. Never
   * use it on SQL: `redact` already hides held literals there.
   */
  maskText: (text: string) => string;
  /**
   * Text that comes back from running restored SQL (column names, errors,
   * preview cells), with every held value masked as a quoted literal and as
   * a whole word, whatever it is held for. A false match there costs
   * nothing, and it covers values held only because SQL was unread.
   */
  maskResultText: (text: string) => string;
  /** The placeholder text (no quotes) a value has, if the vault holds it. */
  getPlaceholder: (value: string) => string | undefined;
  /** True when `text` is exactly a placeholder this vault holds. */
  isHeldPlaceholder: (text: string) => boolean;
};

/** The values one vault holds, by number and by key, and cached masks. */
type HeldValueStore = {
  values: HeldValue[];
  byKey: Map<string, HeldValue>;
  masks: Partial<Record<MaskScope, MaskPattern>>;
};

type MaskPattern = { pattern: RegExp; placeholders: string[] };

function _escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The SQL a held value is written back as. */
function _toRestoredSql(held: HeldValue): string {
  return held.kind === "string" ? SqlLiterals.quote(held.value) : held.text;
}

/** The bare-word pattern for one held value, if it is long enough. */
function _buildBarePattern(held: HeldValue): string | undefined {
  const word = held.value.replaceAll("%", "").trim();
  return word.length >= MIN_MASKED_BARE_LENGTH
    ? `(?<![\\p{L}\\p{N}_])${_escapeRegExp(word)}(?![\\p{L}\\p{N}_])`
    : undefined;
}

/**
 * One regex that finds every held value in text: existing placeholders
 * first (kept as they are), then each value as a quoted literal, then the
 * scope's values as whole words, longest first. One pass, so a
 * replacement is never searched again.
 */
function _buildMaskPattern(
  heldValues: readonly HeldValue[],
  scope: MaskScope,
): MaskPattern {
  const byLength = [...heldValues].sort((first, second) => {
    return second.value.length - first.value.length;
  });
  const quoted = byLength.map((held) => {
    const text = _escapeRegExp(SqlLiterals.quote(held.value));
    return { text, placeholder: `'${held.placeholder}'` };
  });
  const bare = byLength.flatMap((held) => {
    const text =
      scope === "result" || held.reason === "compared"
        ? _buildBarePattern(held)
        : undefined;
    return text === undefined ? [] : [{ text, placeholder: held.placeholder }];
  });
  const alternatives = [
    { text: "<value [1-9]\\d*>", placeholder: "" },
    ...quoted,
    ...bare,
  ];
  const source = alternatives
    .map((entry) => {
      return `(${entry.text})`;
    })
    .join("|");
  return {
    pattern: new RegExp(source, "giu"),
    placeholders: alternatives.map((entry) => {
      return entry.placeholder;
    }),
  };
}

/**
 * Whether redaction hides a literal, and why, or undefined to keep it.
 * Placeholders already in the SQL are kept as they are, and a held value
 * is hidden wherever it appears.
 */
function _getHoldReason(
  literal: SqlLiteral,
  sensitive: SensitiveSqlLiterals,
  held: HeldValue | undefined,
): HoldReason | undefined {
  if (literal.kind === "string" && PLACEHOLDER_VALUE.test(literal.value)) {
    return undefined;
  }
  if (sensitive.kind === "read") {
    return sensitive.reasons.get(SqlLiterals.getKey(literal)) ?? held?.reason;
  }
  const isKeptNumber =
    sensitive.keepsSmallNumbers &&
    literal.kind === "number" &&
    Number(literal.value) <= MAX_KEPT_NUMBER_WHEN_UNREAD;
  return isKeptNumber && held === undefined
    ? undefined
    : (held?.reason ?? "unread");
}

/** The model-facing problem with one literal's placeholders, if any. */
function _getLiteralPlaceholderError(
  literal: SqlLiteral,
  heldCount: number,
): string | undefined {
  const whole =
    literal.kind === "string" ? PLACEHOLDER_VALUE.exec(literal.value) : null;
  if (whole) {
    return Number(whole[1]) > heldCount
      ? `${literal.value} is an unknown placeholder: use only the placeholders shown on the page.`
      : undefined;
  }
  const like = PLACEHOLDER_LIKE.exec(literal.value);
  return like
    ? `${like[0]} must be used as a whole quoted value, written exactly as on the page ('<value N>'), never inside another string or pattern.`
    : undefined;
}

/** Holds a literal, or strengthens why it is held, and returns its entry. */
function _hold(
  store: HeldValueStore,
  literal: SqlLiteral,
  reason: HoldReason,
): HeldValue {
  const key = SqlLiterals.getKey(literal);
  const known = store.byKey.get(key);
  const held = known ?? {
    ...literal,
    placeholder: `<value ${store.values.length + 1}>`,
    reason,
  };
  if (!known) {
    store.values.push(held);
    store.byKey.set(key, held);
  } else if (REASON_RANK[reason] > REASON_RANK[known.reason]) {
    known.reason = reason;
  }
  store.masks = {};
  return held;
}

function _getHeldFromPlaceholder(
  store: HeldValueStore,
  text: string,
): HeldValue | undefined {
  const number = PLACEHOLDER_VALUE.exec(text)?.[1];
  return number === undefined ? undefined : store.values[Number(number) - 1];
}

function _redactSql(
  store: HeldValueStore,
  sql: string,
  detectors: SqlLiteralDetectors,
): string {
  const stripped = SqlLiterals.stripComments(sql);
  const sensitive = findSensitiveSqlLiterals(stripped, detectors);
  return SqlLiterals.replace(stripped, (literal) => {
    const known = store.byKey.get(SqlLiterals.getKey(literal));
    const reason = _getHoldReason(literal, sensitive, known);
    return reason === undefined
      ? undefined
      : `'${_hold(store, literal, reason).placeholder}'`;
  });
}

function _restoreSql(store: HeldValueStore, sql: string): string {
  return SqlLiterals.replace(sql, (literal) => {
    const held =
      literal.kind === "string"
        ? _getHeldFromPlaceholder(store, literal.value)
        : undefined;
    return held === undefined ? undefined : _toRestoredSql(held);
  });
}

/** Masks text for a scope, building that scope's pattern on first use. */
function _maskTextWithStore(
  store: HeldValueStore,
  text: string,
  scope: MaskScope,
): string {
  if (store.values.length === 0) {
    return text;
  }
  const mask = store.masks[scope] ?? _buildMaskPattern(store.values, scope);
  store.masks[scope] = mask;
  return text.replace(mask.pattern, (match: string, ...groups: unknown[]) => {
    // Exactly one capture group matched; its index names the placeholder.
    const index = groups.findIndex((group) => {
      return typeof group === "string";
    });
    return mask.placeholders[index] || match;
  });
}

/**
 * Creates an empty vault. Create one per conversation, so a value's
 * placeholder means the same thing in every turn the model remembers.
 */
export function createSqlPlaceholderVault(): SqlPlaceholderVault {
  const store: HeldValueStore = { values: [], byKey: new Map(), masks: {} };
  return {
    redact: (sql, detectors) => {
      return _redactSql(store, sql, detectors);
    },
    restore: (sql) => {
      return _restoreSql(store, sql);
    },
    getPlaceholderError: (sql) => {
      return SqlLiterals.list(sql)
        .map((literal) => {
          return _getLiteralPlaceholderError(literal, store.values.length);
        })
        .find((error) => {
          return error !== undefined;
        });
    },
    maskText: (text) => {
      return _maskTextWithStore(store, text, "page");
    },
    maskResultText: (text) => {
      return _maskTextWithStore(store, text, "result");
    },
    getPlaceholder: (value) => {
      const held =
        store.byKey.get(SqlLiterals.getKey({ kind: "string", value })) ??
        store.byKey.get(SqlLiterals.getKey({ kind: "number", value }));
      return held?.placeholder;
    },
    isHeldPlaceholder: (text) => {
      return _getHeldFromPlaceholder(store, text) !== undefined;
    },
  };
}
