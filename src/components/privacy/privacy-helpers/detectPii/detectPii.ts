/**
 * Client-side PII heuristics. Used by `crossBoundary` to decide whether to
 * elevate the consent modal before any data leaves the browser for the LLM.
 *
 * Two layers (per the chat-interactive-workflows spec):
 *   A. Column-name keyword match (categorised)
 *   B. Content regex over the actual values being sent
 *
 * Both layers run client-side and never call an LLM. We prefer false
 * positives: a one-click nudge is cheap, a false negative breaks the
 * promise that the LLM never sees row-level data without consent.
 *
 * v1 scope: English only. Spanish + French pattern files stubbed at
 * `src/components/privacy/privacy-helpers/patterns/*` once those locales ship.
 */

export type PiiCategory =
  | "direct_identifier"
  | "government_id"
  | "demographic_sensitive"
  | "financial"
  | "medical"
  | "precise_location"
  | "free_text_risky";

export type PiiSeverity = "clean" | "warning" | "critical";

export type PiiPatternHit = {
  /** Where the hit came from: column-name layer or content layer. */
  layer: "column_name" | "content";
  category: PiiCategory;
  /** Stable, user-presentable label (e.g. "Email", "Phone number"). */
  label: string;
  /** Optional sample value the regex matched. Capped at 80 chars. */
  sampleValue?: string;
};

export type PiiDetectionResult = {
  severity: PiiSeverity;
  hits: PiiPatternHit[];
  /** True when the spec's medical-strict tier applies. */
  isMedical: boolean;
};

const COLUMN_NAME_KEYWORDS: Array<{
  category: PiiCategory;
  label: string;
  keywords: string[];
}> = [
  {
    category: "direct_identifier",
    label: "Name",
    keywords: ["first_name", "last_name", "fname", "lname", "full_name"],
  },
  {
    category: "direct_identifier",
    label: "Contact",
    keywords: ["email", "phone", "mobile", "cell", "telephone", "contact"],
  },
  {
    category: "direct_identifier",
    label: "Address",
    keywords: ["address", "street", "addr", "zip", "postal", "postcode"],
  },
  {
    category: "government_id",
    label: "Government ID",
    keywords: [
      "ssn",
      "social_security",
      "national_id",
      "nin",
      "passport",
      "drivers_license",
      "tax_id",
      "ein",
      "sin",
    ],
  },
  {
    category: "demographic_sensitive",
    label: "Demographic info",
    keywords: [
      "dob",
      "birth_date",
      "date_of_birth",
      "age",
      "gender",
      "sex",
      "ethnicity",
      "race",
      "religion",
      "orientation",
    ],
  },
  {
    category: "financial",
    label: "Financial",
    keywords: [
      "account",
      "iban",
      "swift",
      "card",
      "cc",
      "cvv",
      "bank",
      "routing",
    ],
  },
  {
    category: "medical",
    label: "Medical",
    keywords: [
      "patient",
      "mrn",
      "diagnosis",
      "medication",
      "condition",
      "health_status",
      "hiv",
      "prescription",
    ],
  },
  {
    category: "precise_location",
    label: "Precise location",
    keywords: [
      "lat",
      "latitude",
      "lng",
      "longitude",
      "lon",
      "gps",
      "coords",
      "geolocation",
    ],
  },
  {
    category: "free_text_risky",
    label: "Free-text field",
    keywords: [
      "notes",
      "comments",
      "description",
      "bio",
      "feedback",
      "remarks",
      "narrative",
      "story",
    ],
  },
];

// Standalone "name" (not in a compound like "first_name") is a direct
// identifier hit. We add it after the table to keep compound matching from
// double-firing.
const STANDALONE_NAME_PATTERN = /^name$|_name$|^name_/i;

const CONTENT_PATTERNS: Array<{
  category: PiiCategory;
  label: string;
  regex: RegExp;
  /**
   * Extra validation called per match, e.g. Luhn for credit cards. Returns
   * true if the match should be kept.
   */
  validate?: (match: string) => boolean;
}> = [
  {
    category: "direct_identifier",
    label: "Email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  },
  {
    category: "direct_identifier",
    label: "Phone number",
    // Match US-style numbers first, then loose international as a fallback
    // inside the same pattern. The leading digit count is bounded to avoid
    // matching long invoice numbers, etc.
    regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  },
  {
    category: "government_id",
    label: "US SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/,
  },
  {
    category: "financial",
    label: "Credit card",
    regex: /\b\d{13,19}\b/,
    validate: (match) => {
      const digits = match.replace(/\D/g, "");
      return _passesLuhn(digits);
    },
  },
  {
    category: "financial",
    label: "IBAN",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/,
  },
  {
    category: "direct_identifier",
    label: "IP address",
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
  },
  {
    category: "demographic_sensitive",
    label: "Date of birth",
    regex: /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/,
  },
  {
    category: "direct_identifier",
    label: "Street address",
    regex: /^\d+\s+\w+\s+(St|Ave|Rd|Blvd|Dr|Ln|Way|Ct)\b/i,
  },
];

const CATEGORY_CRITICAL: ReadonlySet<PiiCategory> = new Set([
  "direct_identifier",
  "government_id",
  "medical",
  "financial",
  "precise_location",
]);

const CATEGORY_WARNING: ReadonlySet<PiiCategory> = new Set([
  "demographic_sensitive",
  "free_text_risky",
]);

function _passesLuhn(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digitValue = digits.charCodeAt(i) - 48;
    if (digitValue < 0 || digitValue > 9) {
      return false;
    }
    if (alt) {
      digitValue *= 2;
      if (digitValue > 9) {
        digitValue -= 9;
      }
    }
    sum += digitValue;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function _detectFromColumnName(columnName: string): PiiPatternHit[] {
  const normalized = columnName.toLowerCase();

  const hits: PiiPatternHit[] = COLUMN_NAME_KEYWORDS.filter((entry) => {
    return entry.keywords.some((kw) => {
      return normalized.includes(kw);
    });
  }).map((entry) => {
    return {
      layer: "column_name" as const,
      category: entry.category,
      label: entry.label,
    };
  });

  if (STANDALONE_NAME_PATTERN.test(normalized)) {
    const alreadyHasName = hits.some((h) => {
      return h.label === "Name";
    });
    if (!alreadyHasName) {
      hits.push({
        layer: "column_name",
        category: "direct_identifier",
        label: "Name",
      });
    }
  }

  return hits;
}

function _detectFromContent(values: readonly unknown[]): PiiPatternHit[] {
  const hits: PiiPatternHit[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (value == null) {
      continue;
    }
    const text = String(value);
    if (text.length === 0) {
      continue;
    }

    for (const pattern of CONTENT_PATTERNS) {
      const match = pattern.regex.exec(text);
      if (!match) {
        continue;
      }
      if (pattern.validate && !pattern.validate(match[0])) {
        continue;
      }
      const dedupeKey = `${pattern.label}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      hits.push({
        layer: "content",
        category: pattern.category,
        label: pattern.label,
        sampleValue: match[0].slice(0, 80),
      });
    }
  }

  return hits;
}

function _maxSeverity(hits: readonly PiiPatternHit[]): PiiSeverity {
  if (
    hits.some((h) => {
      return CATEGORY_CRITICAL.has(h.category);
    })
  ) {
    return "critical";
  }
  return (
      hits.some((h) => {
        return CATEGORY_WARNING.has(h.category);
      })
    ) ?
      "warning"
    : "clean";
}

export function detectPii(input: {
  columnName?: string;
  values?: readonly unknown[];
}): PiiDetectionResult {
  const columnHits =
    input.columnName ? _detectFromColumnName(input.columnName) : [];
  const contentHits = input.values ? _detectFromContent(input.values) : [];

  const hits = [...columnHits, ...contentHits];
  let severity = _maxSeverity(hits);

  // Spec rule: when both layers fire, severity is critical regardless of
  // category. This prevents a "warning" column-name severity from masking
  // an actual content match.
  if (columnHits.length > 0 && contentHits.length > 0) {
    severity = "critical";
  }

  const isMedical = hits.some((h) => {
    return h.category === "medical";
  });

  return { severity, hits, isMedical };
}
