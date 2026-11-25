import { describe, expect, it } from "vitest";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

const CONCEPT_ID = "concept_cases" as Concept.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  concept: "Case",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD = {
  id: "attr_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "date",
} as const;

const DISTRICT_FIELD = {
  id: "attr_district",
  columnName: "District",
  label: "District",
  dataType: "varchar",
} as const;

const SOURCE: DataSlotSource = {
  kind: "concept",
  conceptId: CONCEPT_ID,
  name: "Measles cases",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

function _makeBinding(
  attributeMap: Readonly<Record<string, string>>,
): Pick<
  PluginDataSlotBinding.T,
  "attributeMap" | "conceptId" | "datasetId" | "sourceType"
> {
  return {
    sourceType: "concept",
    conceptId: CONCEPT_ID,
    datasetId: undefined,
    attributeMap: { ...attributeMap },
  };
}

describe("getDataSlotBindingStatus", () => {
  it("is unbound when the slot has no binding", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: undefined,
        source: undefined,
      }),
    ).toEqual({ kind: "unbound" });
  });

  it("is broken with a missing source when the bound case type was deleted", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: {
          ..._makeBinding({ onsetDate: ONSET_FIELD.id }),
          conceptId: undefined,
        },
        source: undefined,
      }),
    ).toEqual({ kind: "broken", problems: [{ kind: "source_missing" }] });
  });

  it("is broken with a missing source when the source is a different record", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ onsetDate: ONSET_FIELD.id }),
        source: { ...SOURCE, conceptId: "concept_other" as Concept.Id },
      }),
    ).toEqual({ kind: "broken", problems: [{ kind: "source_missing" }] });
  });

  it("is broken with a missing field when a mapped field no longer exists", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({
          onsetDate: ONSET_FIELD.id,
          district: "attr_deleted",
        }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "broken",
      problems: [{ kind: "field_missing", attributeKey: "district" }],
    });
  });

  it("is broken with a type mismatch when a mapped field's type no longer fits", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ onsetDate: DISTRICT_FIELD.id }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "broken",
      problems: [
        {
          kind: "type_mismatch",
          attributeKey: "onsetDate",
          dataType: "varchar",
        },
      ],
    });
  });

  it("is broken when a required attribute is unmapped", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ district: DISTRICT_FIELD.id }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "broken",
      problems: [{ kind: "required_unmapped", attributeKey: "onsetDate" }],
    });
  });

  it("lists every problem when several attributes are wrong", () => {
    const status = getDataSlotBindingStatus({
      slot: CASES_SLOT,
      binding: _makeBinding({ district: "attr_deleted" }),
      source: SOURCE,
    });

    expect(status).toEqual({
      kind: "broken",
      problems: [
        { kind: "required_unmapped", attributeKey: "onsetDate" },
        { kind: "field_missing", attributeKey: "district" },
      ],
    });
  });

  it("is bound with an unmapped optional attribute read as undefined", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ onsetDate: ONSET_FIELD.id }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "bound",
      fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
    });
  });

  it("is bound with every attribute's field when all are mapped", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({
          onsetDate: ONSET_FIELD.id,
          district: DISTRICT_FIELD.id,
        }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "bound",
      fieldsByAttributeKey: {
        onsetDate: ONSET_FIELD,
        district: DISTRICT_FIELD,
      },
    });
  });

  it("ignores attribute map entries the slot does not declare", () => {
    const status = getDataSlotBindingStatus({
      slot: CASES_SLOT,
      binding: _makeBinding({
        onsetDate: ONSET_FIELD.id,
        retired: "attr_deleted",
      }),
      source: SOURCE,
    });

    expect(status.kind).toBe("bound");
  });

  it("reads an attribute named like an Object method as unmapped, not as a missing field", () => {
    const slot: PluginDataSlot = {
      ...CASES_SLOT,
      attributes: Object.fromEntries([
        [
          "constructor",
          {
            type: "text",
            title: "%slot.cases.constructor%",
            required: false,
          },
        ],
      ]),
    };

    expect(
      getDataSlotBindingStatus({
        slot,
        binding: _makeBinding({}),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "bound",
      fieldsByAttributeKey: { constructor: undefined },
    });
  });
});
