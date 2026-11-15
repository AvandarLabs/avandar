import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable bounded authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "groups",
    label: {
      id: "motionAtlas.equal-count-unequal-volume.controls.groups.label",
      message: "Groups",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                minLength: 1,
                maxLength: 16,
              },
              label: {
                type: "string",
                minLength: 1,
                maxLength: 16,
              },
              bytes: {
                type: "integer",
                minimum: 0,
                maximum: 10000000,
              },
            },
            required: ["id", "label", "bytes"],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 3,
        },
      },
      required: ["id", "label", "items"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.groups.item.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.groups.item.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "items",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.groups.item.items.label",
          message: "Items",
        },
        kind: "collection",
        minItems: 1,
        maxItems: 3,
        itemSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              minLength: 1,
              maxLength: 16,
            },
            label: {
              type: "string",
              minLength: 1,
              maxLength: 16,
            },
            bytes: {
              type: "integer",
              minimum: 0,
              maximum: 10000000,
            },
          },
          required: ["id", "label", "bytes"],
          additionalProperties: false,
        },
        itemControls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.equal-count-unequal-volume.controls.groups.item.items.item.id.label",
              message: "Id",
            },
            kind: "text",
            minLength: 1,
            maxLength: 16,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.equal-count-unequal-volume.controls.groups.item.items.item.label.label",
              message: "Label",
            },
            kind: "text",
            minLength: 1,
            maxLength: 16,
          },
          {
            path: "bytes",
            label: {
              id: "motionAtlas.equal-count-unequal-volume.controls.groups.item.items.item.bytes.label",
              message: "Bytes",
            },
            kind: "number",
            min: 0,
            max: 10000000,
            step: 1,
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.equal-count-unequal-volume.controls.groups.help",
      message:
        "Two small collections with item-level byte quantities. Counts and totals derive exclusively from these items. Exactly 2 groups; unique group IDs 1..16 characters; group labels 1..24 characters; each group has 1..3 items and both lengths are equal; all item IDs globally unique 1..16 characters; item labels 1..16 characters; bytes integers 0..10000000; group byte totals must differ",
    },
  },
  {
    path: "itemKind",
    label: {
      id: "motionAtlas.equal-count-unequal-volume.controls.itemKind.label",
      message: "Item kind",
    },
    kind: "select",
    options: [
      {
        value: "datasets",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.itemKind.datasets",
          message: "datasets",
        },
      },
      {
        value: "rows",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.itemKind.rows",
          message: "rows",
        },
      },
    ],
    help: {
      id: "motionAtlas.equal-count-unequal-volume.controls.itemKind.help",
      message:
        "Selects whether item marks stand for complete datasets or individual rows, without mixing the two grains. datasets or rows; every item in both groups uses the chosen grain; no separate item-count prop",
    },
  },
  {
    path: "measure",
    label: {
      id: "motionAtlas.equal-count-unequal-volume.controls.measure.label",
      message: "Measure",
    },
    kind: "object",
    controls: [
      {
        path: "displayUnit",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.measure.displayUnit.label",
          message: "Display unit",
        },
        kind: "select",
        options: [
          {
            value: "B",
            label: {
              id: "motionAtlas.equal-count-unequal-volume.controls.measure.displayUnit.B",
              message: "B",
            },
          },
          {
            value: "KiB",
            label: {
              id: "motionAtlas.equal-count-unequal-volume.controls.measure.displayUnit.KiB",
              message: "KiB",
            },
          },
          {
            value: "MiB",
            label: {
              id: "motionAtlas.equal-count-unequal-volume.controls.measure.displayUnit.MiB",
              message: "MiB",
            },
          },
        ],
      },
      {
        path: "basisLabel",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.measure.basisLabel.label",
          message: "Basis label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "scaleMaximumBytes",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.measure.scaleMaximumBytes.label",
          message: "Scale maximum bytes",
        },
        kind: "number",
        min: 1,
        max: 60000000,
        step: 1,
      },
    ],
    help: {
      id: "motionAtlas.equal-count-unequal-volume.controls.measure.help",
      message:
        "Defines the common size basis, display conversion, and fixed ruler maximum for both shelves. displayUnit B, KiB, or MiB uses divisors 1, 1024, or 1048576; basisLabel 1..36 characters; scaleMaximumBytes positive integer <= 60000000 and >= both group totals; both groups must share the same stored/uncompressed basis; formatted decimal values may round, geometry uses exact bytes",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.equal-count-unequal-volume.controls.copy.label",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "count",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.copy.count.label",
          message: "Count",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "size",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.copy.size.label",
          message: "Size",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "total",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.copy.total.label",
          message: "Total",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "proxyNote",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.copy.proxyNote.label",
          message: "Proxy note",
        },
        kind: "text",
        minLength: 1,
        maxLength: 52,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.equal-count-unequal-volume.controls.copy.example.label",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 52,
      },
    ],
    help: {
      id: "motionAtlas.equal-count-unequal-volume.controls.copy.help",
      message:
        "Labels the two measures and preserves the limitation of the proxy. All keys required; count, size, total 1..24 characters; proxyNote and example 1..52 characters",
    },
  },
  {
    path: "showItemSizes",
    label: {
      id: "motionAtlas.equal-count-unequal-volume.controls.showItemSizes.label",
      message: "Show item sizes",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.equal-count-unequal-volume.controls.showItemSizes.help",
      message:
        "Shows each item byte quantity beside its persistent ID tab. boolean; both collection totals, item counts, unit, and basis remain visible",
    },
  },
  {
    path: "showCountGuides",
    label: {
      id: "motionAtlas.equal-count-unequal-volume.controls.showCountGuides.label",
      message: "Show count guides",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.equal-count-unequal-volume.controls.showCountGuides.help",
      message:
        "Keeps the one-for-one count alignment visible while byte strips extend. boolean; hiding guides never changes collection length or byte geometry",
    },
  },
];
