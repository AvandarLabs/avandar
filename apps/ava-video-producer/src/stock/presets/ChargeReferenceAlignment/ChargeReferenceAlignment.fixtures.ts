import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ChargeReferenceAlignment.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  invoice: {
    procedureCode: "DEMO-P1",
    providerKey: "Demo clinic A",
    payerKey: "Demo plan Q",
    periodLabel: "Demo period A",
    quantity: 1,
    unitPriceMinor: 8400,
  },
  reference: {
    procedureCode: "DEMO-P1",
    providerKey: "Demo clinic A",
    payerKey: "Demo plan Q",
    periodLabel: "Demo period A",
    quantity: 1,
    unitPriceMinor: 6000,
    sourceLabel: "Fictional rate sheet A",
  },
  money: {
    currencyLabel: "demo credits",
    minorUnitsPerUnit: 100,
  },
  copy: {
    invoice: "Billed line",
    reference: "Reference line",
    procedure: "Procedure",
    provider: "Provider",
    payer: "Payer",
    period: "Period",
    quantity: "Quantity",
    matched: "Same comparison context",
    unmatched: "Context does not match",
    difference: "Billed minus reference",
    review: "Difference requires review",
    example: "Fictional amounts; no entitlement finding",
  },
  focus: "keys",
  showDifference: true,
};
/** Minimum collection sizes and accepted zero quantities. */
export const MINIMUM_INPUT: Input = {
  invoice: {
    procedureCode: "DEMO-P1",
    providerKey: "Demo clinic A",
    payerKey: "Demo plan Q",
    periodLabel: "Demo period A",
    quantity: 1,
    unitPriceMinor: 0,
  },
  reference: {
    procedureCode: "DEMO-P1",
    providerKey: "Demo clinic A",
    payerKey: "Demo plan Q",
    periodLabel: "Demo period A",
    quantity: 1,
    unitPriceMinor: 0,
    sourceLabel: "Fictional rate sheet A",
  },
  money: {
    currencyLabel: "demo credits",
    minorUnitsPerUnit: 1,
  },
  copy: {
    invoice: "Billed line",
    reference: "Reference line",
    procedure: "Procedure",
    provider: "Provider",
    payer: "Payer",
    period: "Period",
    quantity: "Quantity",
    matched: "Same comparison context",
    unmatched: "Context does not match",
    difference: "Billed minus reference",
    review: "Difference requires review",
    example: "Fictional amounts; no entitlement finding",
  },
  focus: "keys",
  showDifference: true,
};
/** Maximum collection density and full display text bounds. */
export const DENSE_INPUT: Input = {
  invoice: {
    procedureCode: "WWWWWWWWWWWWWW",
    providerKey: "WWWWWWWWWWWWWWWWWWWWWW",
    payerKey: "WWWWWWWWWWWWWWWWWWWWWW",
    periodLabel: "WWWWWWWWWWWWWWWWWWWW",
    quantity: 5,
    unitPriceMinor: 1000000,
  },
  reference: {
    procedureCode: "WWWWWWWWWWWWWW",
    providerKey: "WWWWWWWWWWWWWWWWWWWWWW",
    payerKey: "WWWWWWWWWWWWWWWWWWWWWW",
    periodLabel: "WWWWWWWWWWWWWWWWWWWW",
    quantity: 5,
    unitPriceMinor: 6000,
    sourceLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  money: {
    currencyLabel: "WWWWWWWWWWWWWWWWWW",
    minorUnitsPerUnit: 100,
  },
  copy: {
    invoice: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    reference: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    procedure: "WWWWWWWWWWWWWWWW",
    provider: "WWWWWWWWWWWWWWWW",
    payer: "WWWWWWWWWWWWWWWW",
    period: "WWWWWWWWWWWWWWWW",
    quantity: "WWWWWWWWWWWWWWWW",
    matched: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unmatched: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    difference: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    review: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  focus: "keys",
  showDifference: true,
};
/** Changed membership, choice, or measurement display. */
export const CHANGED_INPUT: Input = {
  invoice: {
    procedureCode: "DEMO-P1",
    providerKey: "Demo clinic A",
    payerKey: "Demo plan Q",
    periodLabel: "Demo period A",
    quantity: 1,
    unitPriceMinor: 8400,
  },
  reference: {
    procedureCode: "DEMO-P1",
    providerKey: "Demo clinic A",
    payerKey: "Demo plan R",
    periodLabel: "Demo period A",
    quantity: 1,
    unitPriceMinor: 6000,
    sourceLabel: "Fictional rate sheet A",
  },
  money: {
    currencyLabel: "demo credits",
    minorUnitsPerUnit: 100,
  },
  copy: {
    invoice: "Billed line",
    reference: "Reference line",
    procedure: "Procedure",
    provider: "Provider",
    payer: "Payer",
    period: "Period",
    quantity: "Quantity",
    matched: "Same comparison context",
    unmatched: "Context does not match",
    difference: "Billed minus reference",
    review: "Difference requires review",
    example: "Fictional amounts; no entitlement finding",
  },
  focus: "amounts",
  showDifference: true,
};

/** Complete fixtures for deterministic rendering and text stress. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
