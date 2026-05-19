/**
 * Client-side bias heuristics for user-typed text and LLM-generated
 * clarification questions. Per the chat-interactive-workflows spec,
 * bias hits are **always a soft nudge — never a hard block**. The
 * consent modal lets the user continue as-is, edit themselves, or
 * accept the curated suggestion.
 *
 * v1 ships English-only patterns curated internally. The spec mandates a
 * social-sector-advisor review before Phase 2 ships.
 */

export type BiasCategory =
  | "gender_generalization"
  | "ethnic_cultural_generalization"
  | "loaded_framing"
  | "statistical_assumption";

export type BiasHit = {
  category: BiasCategory;
  /** Stable label shown in the consent modal. */
  label: string;
  /** Curated rewrite suggestion shown to the user. */
  suggestion?: string;
  /** Sample of the matched text, capped at 80 chars. */
  sample: string;
};

export type BiasDetectionResult = {
  hits: BiasHit[];
};

type BiasRule = {
  category: BiasCategory;
  label: string;
  regex: RegExp;
  suggest: (matched: string, fullText: string) => string;
};

const RULES: BiasRule[] = [
  {
    category: "gender_generalization",
    label: "Gender generalization",
    regex:
      /(women|men|girls|boys|females?|males?)\s+(are|aren['']?t|always|never|typically|usually|tend to|generally)\s+(?!equal|diverse|varied)/i,
    suggest: () => {
      return (
        "Rephrase as a question about correlations or observed patterns " +
        '(e.g. "what factors correlate with this outcome among women in our data") ' +
        "rather than a generalization."
      );
    },
  },
  {
    category: "gender_generalization",
    label: "Gender-occupation stereotype",
    regex:
      /(female|male)\s+(engineers?|nurses?|doctors?|teachers?|leaders?)\s+(are|tend|usually)/i,
    suggest: () => {
      return (
        "Consider asking about the data without assuming gender-occupation " +
        "patterns are causal."
      );
    },
  },
  {
    category: "ethnic_cultural_generalization",
    label: "Ethnic / cultural generalization",
    regex:
      /(african|asian|latino|hispanic|indigenous|tribal|muslim|christian|jewish|hindu)\s+(people|community|communities|cultures?)\s+(are|tend|always|usually)/i,
    suggest: () => {
      return (
        "Try framing this as a question about specific behaviors or outcomes " +
        "in your data, not generalizations about a group."
      );
    },
  },
  {
    category: "ethnic_cultural_generalization",
    label: "Loaded cultural descriptor",
    regex:
      /\b(primitive|backward|underdeveloped|third[-\s]?world|uncivilized)\b/i,
    suggest: () => {
      return (
        'Replace loaded descriptors with neutral ones — "low-income", ' +
        '"emerging", or the country/region name your data references.'
      );
    },
  },
  {
    category: "loaded_framing",
    label: "Loaded framing",
    // Allow up to ~6 words between the subject and the loaded adjective so
    // phrases like "why are women in rural areas poor" still match.
    regex:
      /\bwhy\s+(are|do)\s+\w+(?:\s+\w+){0,6}\s+(poor|lazy|violent|illiterate|uneducated)/i,
    suggest: () => {
      return (
        '"Why are X poor / lazy / ..." assumes the premise. Try asking what ' +
        "factors correlate with the outcome you actually care about."
      );
    },
  },
  {
    category: "loaded_framing",
    label: 'Loaded framing — "what\'s wrong with"',
    regex: /\bwhat['']?s\s+wrong\s+with\b/i,
    suggest: () => {
      return '"What\'s wrong with" framing presumes a deficit. Try asking what factors influence the outcome you care about.';
    },
  },
  {
    category: "loaded_framing",
    label: '"Normal" framing',
    regex: /\bnormal\s+(persons?|family|families|households?)\b/i,
    suggest: () => {
      return (
        '"Normal" implies others are abnormal. Describe the comparison group ' +
        'concretely (e.g. "households without children").'
      );
    },
  },
  {
    category: "statistical_assumption",
    label: 'Statistical assumption — "average"',
    regex:
      /\baverage\s+(woman|man|african|asian|latino|indigenous|poor person|disabled person)\b/i,
    suggest: () => {
      return (
        "Averages can obscure variation. Ask about the distribution or " +
        "specific subgroups instead."
      );
    },
  },
  {
    category: "statistical_assumption",
    label: 'Statistical assumption — "typical"',
    regex: /\btypical\s+(woman|man|family from)\b/i,
    suggest: () => {
      return (
        '"Typical X" assumes homogeneity. Try a specific question about ' +
        "the distribution in your data."
      );
    },
  },
];

export function detectBias(text: string): BiasDetectionResult {
  if (!text.trim()) {
    return { hits: [] };
  }

  const hits: BiasHit[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    const match = rule.regex.exec(text);
    if (!match) {
      continue;
    }
    const dedupeKey = rule.label;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    hits.push({
      category: rule.category,
      label: rule.label,
      sample: match[0].slice(0, 80),
      suggestion: rule.suggest(match[0], text),
    });
  }

  return { hits };
}
