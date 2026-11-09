import { homedir } from "node:os";
import type { BBox } from "@/workers/pdfSniff/pdfSniff.types";

/** A figure the assistant should end up with, by rules or by itself. */
export type ExpectedFigure = {
  value: number;
  unit: "n" | "percent" | "usd";
  /** Part of the subject a good answer names, when the text gives one. */
  subject?: string;
};

/**
 * One region a user could send to the PDF table assistant: a passage where
 * the rule-based extractor flags that it read fewer figures than the text
 * holds, which is when the app offers the assistant.
 */
export type PdfAssistCase = {
  id: string;
  /** Where the PDF lives (see `pdfAssistFiles` below). */
  file: keyof typeof PDF_ASSIST_FILES;
  /** 1-based page number. */
  page: number;
  /** pdf.js user space, from the page's bottom-left. */
  bbox: BBox;
  /** Every real measurement in the region. Missing one lowers recall. */
  required: readonly ExpectedFigure[];
  /**
   * Numbers that are fair to extract but not required: statistics such as
   * p-values and confidence bounds, ages that define a population, scales.
   */
  optional: readonly number[];
  /** Why the answer key is what it is, for a reviewer. */
  note: string;
};

const CLEANED = `${homedir()}/cleaned-test-data/Sudan demo data/pdfs`;

/**
 * The PDFs the cases read. Four are in the repo; two come from the shared
 * test-data folder (`~/cleaned-test-data`), as in the chat eval.
 */
export const PDF_ASSIST_FILES = {
  onlineData: "public/test-data/pdf/plos-one-online-research-data-quality.pdf",
  ncdSurveys: "public/test-data/pdf/plos-one-ncd-mobile-phone-surveys.pdf",
  peruInsurance:
    "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf",
  ochaSudan:
    "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf",
  sudanSurveillance: `${CLEANED}/Enhancing-Disease-Surveillance-in-Conflict-Settings.pdf`,
  imcSudan: `${CLEANED}/IntlMedCorps-Sudan-Cholera-Response-SitRep1.pdf`,
} as const;

/**
 * The cases, read by hand from each region's text as the app extracts it
 * (`joinRegionText`). Years, dates, citation markers, list numbering, page
 * and line numbers, identifiers, and names that contain digits (O139,
 * Collection 2) are never measurements: extracting one counts as spurious.
 */
export const PDF_ASSIST_CASES: readonly PdfAssistCase[] = [
  {
    id: "sample-sizes",
    file: "onlineData",
    page: 5,
    bbox: [306, 145, 612, 186],
    required: [
      { value: 2729, unit: "n" },
      { value: 500, unit: "n", subject: "MTurk" },
      { value: 505, unit: "n" },
      { value: 496, unit: "n", subject: "Prolific" },
      { value: 575, unit: "n", subject: "Qualtrics" },
      { value: 653, unit: "n", subject: "undergraduate" },
    ],
    optional: [],
    note: "Sample sizes per platform. The 505 lost its platform name in the PDF's text layer.",
  },
  {
    id: "study-arms",
    file: "ncdSurveys",
    page: 4,
    bbox: [0, 249, 612, 329],
    required: [
      { value: 4, unit: "n" },
      { value: 2, unit: "n" },
    ],
    optional: [],
    note: "Four arms, pooled into two. The 1) to 4) numbering and the 1:1:1:1 ratio are not measurements.",
  },
  {
    id: "randomization",
    file: "ncdSurveys",
    page: 4,
    bbox: [0, 80, 612, 229],
    required: [{ value: 18, unit: "n" }],
    optional: [7, 3],
    note: "The age cut-off. Country dialing codes (880, 256) and the citation [29] are identifiers.",
  },
  {
    id: "cooperation-rr",
    file: "ncdSurveys",
    page: 11,
    bbox: [306, 678, 612, 719],
    required: [
      { value: 40, unit: "percent", subject: "MI" },
      { value: 0.83, unit: "n" },
    ],
    optional: [1.1, 1.27, 0.77, 0.89, 0.001],
    note: "The PDF prints decimals with a middle dot that the text layer shows as an unknown character: 40·0% and RR 0·83. The leading 2%) is the cut-off tail of a number, not a measurement.",
  },
  {
    id: "response-rates",
    file: "ncdSurveys",
    page: 11,
    bbox: [306, 444, 612, 485],
    required: [
      { value: 64.5, unit: "percent", subject: "FV" },
      { value: 61.5, unit: "percent", subject: "II" },
      { value: 66.5, unit: "percent", subject: "MI" },
    ],
    optional: [0.001],
    note: "64·5%, 61·5%, 66·5% with middle-dot decimals; the first rate's whole number is cut off by the region.",
  },
  {
    id: "study-scope",
    file: "peruInsurance",
    page: 2,
    bbox: [298, 655, 595, 766],
    required: [],
    optional: [1],
    note: "Only years, a citation, and the under-1-year age group. Nothing to add.",
  },
  {
    id: "survey-source",
    file: "peruInsurance",
    page: 2,
    bbox: [298, 307, 595, 454],
    required: [{ value: 24, unit: "n" }],
    optional: [],
    note: "24 regions; the rest are citations and the year 2004.",
  },
  {
    id: "population",
    file: "peruInsurance",
    page: 2,
    bbox: [298, 163, 595, 262],
    required: [],
    optional: [1, 15, 49],
    note: "Ages that define the population, and years. Nothing required.",
  },
  {
    id: "atet-results",
    file: "peruInsurance",
    page: 4,
    bbox: [298, 67, 595, 298],
    required: [{ value: 15.7, unit: "percent", subject: "pover" }],
    optional: [14.9, 16.5, 0.568, 0.001],
    note: "A 15.7% reduction in deaths in the poverty group, with its interval and p-values. The 95 of '95% CI' is a confidence level and Table 3 is a reference.",
  },
  {
    id: "citation",
    file: "sudanSurveillance",
    page: 1,
    bbox: [0, 142, 612, 199],
    required: [],
    optional: [],
    note: "A citation block: a year and a thesis number. Nothing to extract.",
  },
  {
    id: "abstract",
    file: "sudanSurveillance",
    page: 3,
    bbox: [0, 389, 612, 721],
    required: [],
    optional: [2],
    note: "Year ranges and 'Period 2'. Nothing required.",
  },
  {
    id: "serotypes",
    file: "sudanSurveillance",
    page: 6,
    bbox: [0, 99, 612, 252],
    required: [
      { value: 200, unit: "n" },
      { value: 2, unit: "n" },
    ],
    optional: [100000, 100000000],
    note: "More than 200 serotypes, two cause outbreaks. The dose '10 to 10' lost its exponents (10^5 to 10^8); reading them back is fair but not required. O1/O139 are names and 6 5 8 are superscripts.",
  },
  {
    id: "since-2004",
    file: "imcSudan",
    page: 1,
    bbox: [306, 379, 612, 470],
    required: [],
    optional: [],
    note: "Only a year. Nothing to extract.",
  },
  {
    id: "coordination",
    file: "ochaSudan",
    page: 3,
    bbox: [0, 698, 298, 791],
    required: [],
    optional: [],
    note: "The only number is the section heading 6. Nothing to extract.",
  },
  {
    id: "data-sources",
    file: "sudanSurveillance",
    page: 15,
    bbox: [0, 85, 612, 293],
    required: [
      { value: 500, unit: "n" },
      { value: 1, unit: "n" },
    ],
    optional: [-1],
    note: "Satellite resolutions: 500 meters and 1 kilometer. 74, 75, 76 are the thesis's line numbers and Collection 2 is a name; the -1 to 1 index scales are fair but not required.",
  },
  {
    id: "data-gaps",
    file: "sudanSurveillance",
    page: 16,
    bbox: [0, 85, 612, 266],
    required: [],
    optional: [],
    note: "Only dates of reporting gaps. Nothing to extract.",
  },
  {
    id: "lag-range",
    file: "sudanSurveillance",
    page: 18,
    bbox: [0, 582, 612, 721],
    required: [{ value: 25, unit: "n" }],
    optional: [-25, 0.1, 0.2],
    note: "A lag range of -25 to +25 weeks; the correlation cut-offs are fair but not required.",
  },
];
