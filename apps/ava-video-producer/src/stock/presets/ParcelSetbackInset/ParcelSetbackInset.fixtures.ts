import { inputSchema } from "./ParcelSetbackInset.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete fictional defaults, validated at the content boundary. */
export const defaultInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    parcels: [
      {
        id: "a",
        label: "Plot A",
        x: 5,
        y: 15,
        width: 35,
        height: 60,
      },
      {
        id: "b",
        label: "Plot B",
        x: 55,
        y: 15,
        width: 35,
        height: 60,
      },
    ],
    setback: 4,
    structure: {
      label: "Demo service kiosk",
      width: 20,
      height: 24,
    },
    placement: {
      parcelId: "b",
      centerX: 72.5,
      centerY: 45,
    },
    copy: {
      context: "Fictional siting geometry only",
      parcel: "Original parcel",
      envelope: "Remaining envelope",
      clearance: "Authored clearance",
      empty: "No remaining envelope",
      unit: "schematic units",
    },
    showDimensions: true,
  });
/** A complete alternate behavior and toggle input. */
export const changedInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    parcels: [
      {
        id: "a",
        label: "Plot A",
        x: 5,
        y: 15,
        width: 5,
        height: 60,
      },
      {
        id: "b",
        label: "Plot B",
        x: 55,
        y: 15,
        width: 35,
        height: 60,
      },
    ],
    setback: 4,
    structure: {
      label: "Demo service kiosk",
      width: 20,
      height: 24,
    },
    placement: {
      parcelId: "b",
      centerX: 72.5,
      centerY: 45,
    },
    copy: {
      context: "Fictional siting geometry only",
      parcel: "Original parcel",
      envelope: "Remaining envelope",
      clearance: "Authored clearance",
      empty: "No remaining envelope",
      unit: "schematic units",
    },
    showDimensions: false,
  });
/** Default, minimum, dense and changed-input cases. */
export const fixtures: StockContract<typeof defaultInput>["fixtures"] = [
  { id: "default", input: defaultInput },
  {
    id: "minimum",
    input: inputSchema.parse({
      parcels: [
        {
          id: "",
          label: "Plot B",
          x: 55,
          y: 15,
          width: 35,
          height: 60,
        },
      ],
      setback: 0,
      structure: {
        label: "Demo service kiosk",
        width: 20,
        height: 24,
      },
      placement: {
        parcelId: "",
        centerX: 72.5,
        centerY: 45,
      },
      copy: {
        context: "Fictional siting geometry only",
        parcel: "Original parcel",
        envelope: "Remaining envelope",
        clearance: "Authored clearance",
        empty: "No remaining envelope",
        unit: "schematic units",
      },
      showDimensions: true,
    }),
  },
  {
    id: "dense",
    input: inputSchema.parse({
      parcels: [
        {
          id: "0",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 5,
          y: 15,
          width: 25,
          height: 60,
        },
        {
          id: "1",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 35,
          y: 15,
          width: 25,
          height: 60,
        },
        {
          id: "2",
          label: "MMMMMMMMMMMMMMMMMMMM",
          x: 65,
          y: 15,
          width: 25,
          height: 60,
        },
      ],
      setback: 4,
      structure: {
        label: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        width: 10,
        height: 24,
      },
      placement: {
        parcelId: "1",
        centerX: 47.5,
        centerY: 45,
      },
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        parcel: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        envelope: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        clearance: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        empty: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showDimensions: true,
    }),
  },
  { id: "changed", input: changedInput },
];
/** Common structural rejection examples. */
export const invalidInputs: unknown[] = [
  {},
  { ...defaultInput, extra: true },
  { ...defaultInput, copy: { ...defaultInput.copy, context: "x".repeat(45) } },
  { ...defaultInput, parcels: [] },
];
