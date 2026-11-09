import { SqlLiterals } from "$/agent/pageContext/SqlLiterals";
import { findSensitiveSqlLiterals } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import type { SqlLiteral } from "$/agent/pageContext/SqlLiterals";
import type {
  SensitiveSqlLiterals,
  SqlLiteralDetectors,
} from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";

/** A placeholder's text inside its quotes, such as `<value 3>`. */
const PLACEHOLDER_VALUE = /^<value ([1-9]\d*)>$/;

/** Any placeholder inside a longer text. */
const PLACEHOLDER_IN_TEXT = /<value ([1-9]\d*)>/;

/**
 * In SQL that could not be read, numbers this small stay as written: they
 * are column positions (`GROUP BY 1`), limits, and months, not people.
 */
const MAX_KEPT_NUMBER_WHEN_UNREAD = 99;

/** The shortest bare value `maskText` looks for in free text. */
const MIN_MASKED_BARE_LENGTH = 2;

/**
 * Why a value is held: a detector flagged it, or its SQL could not be read
 * and every literal was hidden. Only detected values are masked as bare
 * words in titles and names, since an unread chart's `'month'` is not
 * personal.
 */
type HoldReason = "detected" | "unread";

type HeldValue = SqlLiteral & { placeholder: string; reason: HoldReason };

/**
 * Swaps personal values in SQL for numbered placeholders and back, for one
 * conversation with a hosted model. The model reads `'<value 1>'` where the
 * page SQL said `'Jane Doe'`, can keep that placeholder in the SQL it
 * writes, and the browser puts the value back before the SQL runs. The
 * values never leave the vault, which lives only in the browser.
 *
 * A number's placeholder is quoted like a string's in the SQL the model
 * reads; restoring writes the number back unquoted.
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
   * an unknown placeholder, or one inside a longer string. Undefined when
   * every placeholder is a whole, known value.
   */
  getPlaceholderError: (sql: string) => string | undefined;
  /**
   * Text with held values swapped for their placeholders: each value as a
   * quoted SQL literal, and each detected value as a whole word, ignoring
   * case. Use it on anything shown to the model that could repeat a value,
   * such as result column names, errors, chart titles, and page names.
   */
  maskText: (text: string) => string;
  /** The placeholder text (no quotes) a value has, if the vault holds it. */
  getPlaceholder: (value: string) => string | undefined;
  /** True when `text` is exactly a placeholder this vault holds. */
  isHeldPlaceholder: (text: string) => boolean;
};

function _escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The SQL a held value is written back as. */
function _toRestoredSql(held: HeldValue): string {
  if (held.kind === "string") {
    return SqlLiterals.quote(held.value);
  }
  return held.kind === "number" ? held.value : held.text;
}

/**
 * One regex that finds every held value in text: existing placeholders
 * first (kept as they are), then each value as a quoted literal, then each
 * detected value as a whole word, longest first. One pass, so a
 * replacement is never searched again.
 */
function _buildMaskPattern(
  heldValues: readonly HeldValue[],
): { pattern: RegExp; placeholders: string[] } | undefined {
  const byLength = [...heldValues].sort((first, second) => {
    return second.value.length - first.value.length;
  });
  const quoted = byLength.map((held) => {
    const text = _escapeRegExp(SqlLiterals.quote(held.value));
    return { text, placeholder: `'${held.placeholder}'` };
  });
  const bare = byLength.flatMap((held) => {
    const word = held.value.replaceAll("%", "").trim();
    return held.reason === "detected" && word.length >= MIN_MASKED_BARE_LENGTH
      ? [
          {
            text: `(?<![\\p{L}\\p{N}_])${_escapeRegExp(word)}(?![\\p{L}\\p{N}_])`,
            placeholder: held.placeholder,
          },
        ]
      : [];
  });
  const alternatives = [
    { text: "<value [1-9]\\d*>", placeholder: "" },
    ...quoted,
    ...bare,
  ];
  return heldValues.length === 0
    ? undefined
    : {
        pattern: new RegExp(
          alternatives
            .map((entry) => {
              return `(${entry.text})`;
            })
            .join("|"),
          "giu",
        ),
        placeholders: alternatives.map((entry) => {
          return entry.placeholder;
        }),
      };
}

/**
 * Whether redaction hides a literal, and why, or undefined to keep it.
 * Placeholders already in the SQL are kept as they are.
 */
function _getHoldReason(
  literal: SqlLiteral,
  sensitive: SensitiveSqlLiterals,
  held: HeldValue | undefined,
): HoldReason | undefined {
  if (literal.kind === "string" && PLACEHOLDER_VALUE.test(literal.value)) {
    return undefined;
  }
  if (sensitive !== "all") {
    return sensitive.has(SqlLiterals.getKey(literal))
      ? "detected"
      : held?.reason;
  }
  const isSmallNumber =
    literal.kind === "number" &&
    Number(literal.value) <= MAX_KEPT_NUMBER_WHEN_UNREAD;
  return isSmallNumber && held === undefined
    ? undefined
    : (held?.reason ?? "unread");
}

/** The model-facing problem with one string literal's placeholders. */
function _getLiteralPlaceholderError(
  value: string,
  heldCount: number,
): string | undefined {
  const whole = PLACEHOLDER_VALUE.exec(value);
  if (whole) {
    return Number(whole[1]) > heldCount
      ? `${value} is an unknown placeholder: use only the placeholders shown on the page.`
      : undefined;
  }
  const inside = PLACEHOLDER_IN_TEXT.exec(value);
  return inside
    ? `${inside[0]} must be used as a whole quoted value, never inside another string or pattern.`
    : undefined;
}

/** The values one vault holds, by number and by key, and their mask. */
type HeldValueStore = {
  values: HeldValue[];
  byKey: Map<string, HeldValue>;
  mask: ReturnType<typeof _buildMaskPattern>;
};

/** Holds a literal, or updates why it is held, and returns its entry. */
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
  if (known) {
    known.reason = known.reason === "detected" ? "detected" : reason;
  } else {
    store.values.push(held);
    store.byKey.set(key, held);
  }
  store.mask = _buildMaskPattern(store.values);
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

function _maskTextWithStore(store: HeldValueStore, text: string): string {
  if (store.mask === undefined) {
    return text;
  }
  const { pattern, placeholders } = store.mask;
  return text.replace(pattern, (match: string, ...groups: unknown[]) => {
    // Exactly one capture group matched; its index names the placeholder.
    const index = groups.findIndex((group) => {
      return typeof group === "string";
    });
    return placeholders[index] || match;
  });
}

/**
 * Creates an empty vault. Create one per conversation, so a value's
 * placeholder means the same thing in every turn the model remembers.
 */
export function createSqlPlaceholderVault(): SqlPlaceholderVault {
  const store: HeldValueStore = {
    values: [],
    byKey: new Map(),
    mask: undefined,
  };
  return {
    redact: (sql, detectors) => {
      return _redactSql(store, sql, detectors);
    },
    restore: (sql) => {
      return _restoreSql(store, sql);
    },
    getPlaceholderError: (sql) => {
      return SqlLiterals.list(sql)
        .filter((literal) => {
          return literal.kind !== "number";
        })
        .map((literal) => {
          return _getLiteralPlaceholderError(
            literal.value,
            store.values.length,
          );
        })
        .find((error) => {
          return error !== undefined;
        });
    },
    maskText: (text) => {
      return _maskTextWithStore(store, text);
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
