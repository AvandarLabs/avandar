import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const {
  getAttributesMock,
  getColumnsMock,
  getConceptByIdMock,
  getDatasetByIdMock,
} = vi.hoisted(() => {
  return {
    getAttributesMock: vi.fn(),
    getColumnsMock: vi.fn(),
    getConceptByIdMock: vi.fn(),
    getDatasetByIdMock: vi.fn(),
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { getById: getConceptByIdMock } };
});

vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { getAll: getAttributesMock } };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getById: getDatasetByIdMock } };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: getColumnsMock } };
});

const { loadDataSlotSource } =
  await import("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource");

const CONCEPT = Model.make("Concept", {
  id: "concept_cases",
  name: "Measles cases",
}) as Concept.T;

const ONSET_ATTRIBUTE = Model.make("ConceptAttribute", {
  id: "attr_onset",
  conceptId: CONCEPT.id,
  name: "Onset date",
  dataType: "date",
  isArray: false,
}) as ConceptAttribute.T;

const DATASET = Model.make("Dataset", {
  id: "dataset_line_list",
  name: "line_list.csv",
}) as Dataset.T;

const ONSET_COLUMN = Model.make("DatasetColumn", {
  id: "col_onset",
  datasetId: DATASET.id,
  name: "onset",
  columnIdx: 0,
  dataType: "date",
}) as DatasetColumn.T;

describe("loadDataSlotSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConceptByIdMock.mockResolvedValue(CONCEPT);
    getAttributesMock.mockResolvedValue([ONSET_ATTRIBUTE]);
    getDatasetByIdMock.mockResolvedValue(DATASET);
    getColumnsMock.mockResolvedValue([ONSET_COLUMN]);
  });

  it("builds a case type source from the stored case type and its attributes", async () => {
    const source = await loadDataSlotSource({
      sourceType: "concept",
      conceptId: CONCEPT.id,
      datasetId: undefined,
    });

    expect(source).toEqual({
      kind: "concept",
      conceptId: CONCEPT.id,
      name: "Measles cases",
      fields: [
        {
          id: "attr_onset",
          columnName: "Onset date",
          label: "Onset date",
          dataType: "date",
        },
      ],
    });
  });

  it("reads only the bound case type's attributes", async () => {
    await loadDataSlotSource({
      sourceType: "concept",
      conceptId: CONCEPT.id,
      datasetId: undefined,
    });

    expect(getAttributesMock).toHaveBeenCalledWith(
      where("concept_id", "eq", CONCEPT.id),
    );
  });

  it("is undefined when the case type is gone or the user cannot read it", async () => {
    getConceptByIdMock.mockResolvedValue(undefined);

    const source = await loadDataSlotSource({
      sourceType: "concept",
      conceptId: CONCEPT.id,
      datasetId: undefined,
    });

    expect(source).toBeUndefined();
  });

  it("is undefined without reading anything when the bound id was cleared", async () => {
    const source = await loadDataSlotSource({
      sourceType: "concept",
      conceptId: undefined,
      datasetId: undefined,
    });

    expect(source).toBeUndefined();
    expect(getConceptByIdMock).not.toHaveBeenCalled();
  });

  it("builds a dataset source from the stored dataset and its columns", async () => {
    const source = await loadDataSlotSource({
      sourceType: "dataset",
      conceptId: undefined,
      datasetId: DATASET.id,
    });

    expect(source).toEqual({
      kind: "dataset",
      datasetId: DATASET.id,
      name: "line_list.csv",
      fields: [
        {
          id: "col_onset",
          columnName: "onset",
          label: "onset",
          dataType: "date",
        },
      ],
    });
    expect(getColumnsMock).toHaveBeenCalledWith(
      where("dataset_id", "eq", DATASET.id),
    );
  });

  it("is undefined when the dataset is gone or the user cannot read it", async () => {
    getDatasetByIdMock.mockResolvedValue(undefined);

    const source = await loadDataSlotSource({
      sourceType: "dataset",
      conceptId: undefined,
      datasetId: DATASET.id,
    });

    expect(source).toBeUndefined();
  });
});
