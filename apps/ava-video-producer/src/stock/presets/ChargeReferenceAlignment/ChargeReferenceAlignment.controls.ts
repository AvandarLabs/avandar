import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable bounded authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "invoice",
    label: {
      id: "motionAtlas.charge-reference-alignment.controls.invoice.label",
      message: "Invoice",
    },
    kind: "object",
    controls: [
      {
        path: "procedureCode",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.invoice.procedureCode.label",
          message: "Procedure code",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
      {
        path: "providerKey",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.invoice.providerKey.label",
          message: "Provider key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "payerKey",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.invoice.payerKey.label",
          message: "Payer key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.invoice.periodLabel.label",
          message: "Period label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "quantity",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.invoice.quantity.label",
          message: "Quantity",
        },
        kind: "number",
        min: 1,
        max: 5,
        step: 1,
      },
      {
        path: "unitPriceMinor",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.invoice.unitPriceMinor.label",
          message: "Unit price minor",
        },
        kind: "number",
        min: 0,
        max: 1000000,
        step: 1,
      },
    ],
    help: {
      id: "motionAtlas.charge-reference-alignment.controls.invoice.help",
      message:
        "One fictional billed line with an amount in the shared smallest monetary unit. procedureCode 1..14 characters; providerKey and payerKey 1..22 characters; periodLabel 1..20 characters; quantity integer 1..5; unitPriceMinor integer 0..1000000; no real patient identifiers or real procedure codes in defaults",
    },
  },
  {
    path: "reference",
    label: {
      id: "motionAtlas.charge-reference-alignment.controls.reference.label",
      message: "Reference",
    },
    kind: "object",
    controls: [
      {
        path: "procedureCode",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.procedureCode.label",
          message: "Procedure code",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
      {
        path: "providerKey",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.providerKey.label",
          message: "Provider key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "payerKey",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.payerKey.label",
          message: "Payer key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.periodLabel.label",
          message: "Period label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "quantity",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.quantity.label",
          message: "Quantity",
        },
        kind: "number",
        min: 1,
        max: 5,
        step: 1,
      },
      {
        path: "unitPriceMinor",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.unitPriceMinor.label",
          message: "Unit price minor",
        },
        kind: "number",
        min: 0,
        max: 1000000,
        step: 1,
      },
      {
        path: "sourceLabel",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.reference.sourceLabel.label",
          message: "Source label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
    help: {
      id: "motionAtlas.charge-reference-alignment.controls.reference.help",
      message:
        "A separately supplied reference with its own source label. Key bounds match invoice; quantity integer 1..5; unitPriceMinor integer 0..1000000; sourceLabel 1..34 characters; comparison eligibility requires exact equality of all four context keys and quantity",
    },
  },
  {
    path: "money",
    label: {
      id: "motionAtlas.charge-reference-alignment.controls.money.label",
      message: "Money",
    },
    kind: "object",
    controls: [
      {
        path: "currencyLabel",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.money.currencyLabel.label",
          message: "Currency label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "minorUnitsPerUnit",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.money.minorUnitsPerUnit.label",
          message: "Minor units per unit",
        },
        kind: "select",
        options: [
          {
            value: 1,
            label: {
              id: "motionAtlas.charge-reference-alignment.controls.money.minorUnitsPerUnit.1",
              message: "1",
            },
          },
          {
            value: 100,
            label: {
              id: "motionAtlas.charge-reference-alignment.controls.money.minorUnitsPerUnit.100",
              message: "100",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.charge-reference-alignment.controls.money.help",
      message:
        "Defines one common monetary unit for both lines and the signed difference. currencyLabel 1..18 characters; minorUnitsPerUnit exactly 1 or 100; both lines use this same currency and unit scale; no exchange-rate conversion",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.charge-reference-alignment.controls.copy.label",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "invoice",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.invoice.label",
          message: "Invoice",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "reference",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.reference.label",
          message: "Reference",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "procedure",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.procedure.label",
          message: "Procedure",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "provider",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.provider.label",
          message: "Provider",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "payer",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.payer.label",
          message: "Payer",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "period",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.period.label",
          message: "Period",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "quantity",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.quantity.label",
          message: "Quantity",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "matched",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.matched.label",
          message: "Matched",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "unmatched",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.unmatched.label",
          message: "Unmatched",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "difference",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.difference.label",
          message: "Difference",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "review",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.review.label",
          message: "Review",
        },
        kind: "text",
        minLength: 1,
        maxLength: 52,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.copy.example.label",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 52,
      },
    ],
    help: {
      id: "motionAtlas.charge-reference-alignment.controls.copy.help",
      message:
        "All visible context, outcome, and evidence labels. All keys required; key labels 1..16 characters; outcome labels 1..32 characters; review and example 1..52 characters Source-role captions invoice and reference are 1..32 characters.",
    },
  },
  {
    path: "focus",
    label: {
      id: "motionAtlas.charge-reference-alignment.controls.focus.label",
      message: "Focus",
    },
    kind: "select",
    options: [
      {
        value: "keys",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.focus.keys",
          message: "keys",
        },
      },
      {
        value: "amounts",
        label: {
          id: "motionAtlas.charge-reference-alignment.controls.focus.amounts",
          message: "amounts",
        },
      },
    ],
    help: {
      id: "motionAtlas.charge-reference-alignment.controls.focus.help",
      message:
        "Chooses whether the matched windows or the amount rulers receive the final emphasis. keys or amounts; amount focus never hides unmatched context or creates a comparison",
    },
  },
  {
    path: "showDifference",
    label: {
      id: "motionAtlas.charge-reference-alignment.controls.showDifference.label",
      message: "Show difference",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.charge-reference-alignment.controls.showDifference.help",
      message:
        "Shows the signed total-amount difference only after complete context agreement. boolean; totals are quantity times unitPriceMinor; difference equals invoice total minus reference total; mismatch suppresses both numeric difference and difference geometry",
    },
  },
];
