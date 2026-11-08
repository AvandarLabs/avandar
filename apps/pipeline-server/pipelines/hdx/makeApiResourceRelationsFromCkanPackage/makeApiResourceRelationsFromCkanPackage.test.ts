import { makeApiResourceRelationsFromCkanPackage } from "@pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage";
import { describe, expect, it, vi } from "vitest";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { EtlPipelineMetrics, RelationColumn } from "@avandar/etl";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";
import type { HdxScope } from "@pipelines/hdx/hdxScopes";

const CKAN_DRIVE: HdxDrive = {
  baseUrl: "https://data.humdata.org",
  organizationLabels: { 1: "Organization" },
};
const MAPPED_FIELDS = { organization1Name: "Test Org" };

function _packageWithOneCsv(
  overrides: Partial<CkanPackage["resources"][number]>,
): CkanPackage {
  return {
    sourceRecord: {},
    id: "c3429f0e",
    name: "movement-range-maps",
    metadata_modified: "2025-11-19T10:29:46.280529",
    resources: [
      {
        id: "csv-1",
        name: "data.csv",
        format: "CSV",
        url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
        url_type: "upload",
        size: 200,
        hash: "abc",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
        ...overrides,
      },
    ],
  };
}

const CSV_SCOPE: HdxScope = { key: "format:csv", resourceFormat: "CSV" };
const PARQUET_SCOPE: HdxScope = {
  key: "format:parquet",
  resourceFormat: "Parquet",
};
const OTHER_SCOPE: HdxScope = {
  key: "format:other",
  resourceFormat: undefined,
  excludedFormats: ["CSV", "Parquet"],
};

const SNIFFED_COLUMNS: RelationColumn[] = [
  { name: "value", originalDataType: "DOUBLE", castDataType: "DOUBLE" },
];

async function _readSniffedColumns(): Promise<readonly RelationColumn[]> {
  return SNIFFED_COLUMNS;
}

function _metrics() {
  const values: Record<string, number> = {};
  const metrics: EtlPipelineMetrics = {
    increment: (name, by = 1) => {
      values[name] = (values[name] ?? 0) + by;
    },
    time: async (name, work) => {
      values[name] = (values[name] ?? 0) + 1;
      return work();
    },
  };
  return { metrics, values };
}

describe("makeApiResourceRelationsFromCkanPackage", () => {
  it("builds one relation per readable resource of the scope's format, dated by metadata_modified", async () => {
    const ckanPackage: CkanPackage = {
      sourceRecord: {},
      id: "c3429f0e",
      name: "movement-range-maps",
      metadata_modified: "2025-11-19T10:29:46.280529",
      resources: [
        {
          id: "readme-1",
          name: "README.txt",
          format: "TXT",
          url: "https://data.humdata.org/dataset/x/resource/readme-1/download/readme.txt",
          url_type: "upload",
          size: 100,
          hash: "",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
        {
          id: "csv-1",
          name: "data.csv",
          format: "CSV",
          url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
          url_type: "upload",
          size: 200,
          hash: "abc",
          last_modified: "2026-01-01T00:00:00Z",
          mimetype: undefined,
          datastore_active: false,
        },
        {
          id: "parquet-1",
          name: "data.parquet",
          format: "parquet",
          url: "https://data.humdata.org/dataset/x/resource/parquet-1/download/data.parquet",
          url_type: "upload",
          size: 150,
          hash: "def",
          last_modified: "2026-01-02T00:00:00Z",
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(relations).toEqual([
      {
        kind: "api_resource",
        externalDatasetId: "movement-range-maps",
        apiResourceId: "csv-1",
        apiResourceFormat: "CSV",
        displayName: "data.csv",
        organization1Name: "Test Org",
        sourceMetadata: {},
        sourceUpdatedAt: new Date("2025-11-19T10:29:46.280Z"),
        sourceAssetType: "upload",
        sourceUrl:
          "https://data.humdata.org/dataset/movement-range-maps/resource/csv-1",
        sourceDownloadUrl:
          "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
        columns: [],
        sourceSizeBytes: 200,
      },
    ]);
  });

  it("uses the headers HDX recorded instead of reading the file", async () => {
    const readFileColumns = vi.fn(_readSniffedColumns);

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage: _packageWithOneCsv({ fileHeaders: ["adm1", "year"] }),
      scope: CSV_SCOPE,
      readFileColumns,
      metrics: _metrics().metrics,
    });

    expect(
      relations[0]?.columns.map((column) => {
        return column.name;
      }),
    ).toEqual(["adm1", "year"]);
    expect(readFileColumns).not.toHaveBeenCalled();
  });

  it("lists a Parquet resource whose columns cannot be read as unloadable", async () => {
    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage: _packageWithOneCsv({ format: "Parquet" }),
      scope: PARQUET_SCOPE,
      readFileColumns: async () => {
        return undefined;
      },
      metrics: _metrics().metrics,
    });

    expect(
      relations.map((relation) => {
        return [relation.isWorkspaceLoadable, relation.columns];
      }),
    ).toEqual([[false, []]]);
  });

  it("lists a CSV that HDX does not host as unloadable, without reading it", async () => {
    const readFileColumns = vi.fn(_readSniffedColumns);

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage: _packageWithOneCsv({
        url: "http://example.invalid/data.csv",
        url_type: "",
        fileHeaders: ["adm1"],
      }),
      scope: CSV_SCOPE,
      readFileColumns,
      metrics: _metrics().metrics,
    });

    expect(
      relations.map((relation) => {
        return [
          relation.isWorkspaceLoadable,
          relation.columns,
          relation.sourceAssetType,
          relation.sourceDownloadUrl,
        ];
      }),
    ).toEqual([[false, [], undefined, "http://example.invalid/data.csv"]]);
    expect(readFileColumns).not.toHaveBeenCalled();
  });

  it("lists every other format in the other scope as unloadable, without reading it", async () => {
    const readFileColumns = vi.fn(_readSniffedColumns);
    const [csvResource] = _packageWithOneCsv({}).resources;
    const ckanPackage: CkanPackage = {
      ..._packageWithOneCsv({}),
      resources: [
        csvResource!,
        { ...csvResource!, id: "pdf-1", format: "PDF" },
        { ...csvResource!, id: "parquet-1", format: "parquet" },
        { ...csvResource!, id: "blank-1", format: "" },
      ],
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: OTHER_SCOPE,
      readFileColumns,
      metrics: _metrics().metrics,
    });

    expect(
      relations.map((relation) => {
        return [
          relation.apiResourceId,
          relation.apiResourceFormat,
          relation.isWorkspaceLoadable,
          relation.columns,
        ];
      }),
    ).toEqual([
      ["pdf-1", "PDF", false, []],
      ["blank-1", undefined, false, []],
    ]);
    expect(readFileColumns).not.toHaveBeenCalled();
  });

  it("returns no relations when the dataset has no resource in the scope's format", async () => {
    const ckanPackage: CkanPackage = {
      sourceRecord: {},
      id: "c3429f0e",
      name: "docs-only-dataset",
      metadata_modified: undefined,
      resources: [
        {
          id: "readme-1",
          name: "README.txt",
          format: "TXT",
          url: "https://data.humdata.org/dataset/x/resource/readme-1/download/readme.txt",
          url_type: "upload",
          size: 100,
          hash: "",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    expect(
      await makeApiResourceRelationsFromCkanPackage({
        drive: CKAN_DRIVE,
        mappedFields: MAPPED_FIELDS,
        ckanPackage,
        scope: CSV_SCOPE,
        readFileColumns: _readSniffedColumns,
        metrics: _metrics().metrics,
      }),
    ).toEqual([]);
  });

  it("keeps only the scope's format, whatever the resource's case", async () => {
    const ckanPackage: CkanPackage = {
      sourceRecord: {},
      id: "c3429f0e",
      name: "movement-range-maps",
      metadata_modified: "2025-11-19T10:29:46.280529",
      resources: [
        {
          id: "csv-1",
          name: "data.csv",
          format: "CSV",
          url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
          url_type: "upload",
          size: 200,
          hash: "abc",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
        {
          id: "parquet-1",
          name: "data.parquet",
          format: "parquet",
          url: "https://data.humdata.org/dataset/x/resource/parquet-1/download/data.parquet",
          url_type: "upload",
          size: 150,
          hash: "def",
          last_modified: undefined,
          mimetype: undefined,
          datastore_active: false,
        },
      ],
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: PARQUET_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(
      relations.map((relation) => {
        return [relation.apiResourceId, relation.apiResourceFormat];
      }),
    ).toEqual([["parquet-1", "PARQUET"]]);
  });

  it("reports the size CKAN records for each resource", async () => {
    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage: _packageWithOneCsv({
        fileHeaders: ["adm1"],
        size: 4096,
      }),
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(relations[0]?.sourceSizeBytes).toBe(4096);
  });

  it("gives every resource relation of a package the same mapped fields", async () => {
    const [csvResource] = _packageWithOneCsv({}).resources;
    const ckanPackage: CkanPackage = {
      ..._packageWithOneCsv({ fileHeaders: ["adm1"] }),
      resources: [
        { ...csvResource!, fileHeaders: ["adm1"] },
        { ...csvResource!, id: "csv-2", fileHeaders: ["adm2"] },
      ],
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: { ...MAPPED_FIELDS, tags: ["x"] },
      ckanPackage,
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(
      relations.map((relation) => {
        return [relation.apiResourceId, relation.tags];
      }),
    ).toEqual([
      ["csv-1", ["x"]],
      ["csv-2", ["x"]],
    ]);
  });

  it("keeps the raw package with only the relation's own raw resource, without its bulky check reports and license text", async () => {
    const [csvResource] = _packageWithOneCsv({}).resources;
    const rawCsv1 = { id: "csv-1", format: "CSV", sdd_report: { rows: 9 } };
    const rawCsv2 = { id: "csv-2", format: "CSV", sdd_report: { rows: 4 } };
    const rawPdf = { id: "pdf-1", format: "PDF" };
    const ckanPackage: CkanPackage = {
      ..._packageWithOneCsv({ fileHeaders: ["adm1"] }),
      sourceRecord: {
        name: "movement-range-maps",
        notes: "Movement range maps.",
        license_other: "The full text of a custom license.",
        resources: [
          { ...rawCsv1, fs_check_info: [{ hxl_proxy_response: {} }] },
          { ...rawCsv2, fs_check_info: [{ hxl_proxy_response: {} }] },
          rawPdf,
        ],
      },
      resources: [
        { ...csvResource!, fileHeaders: ["adm1"] },
        { ...csvResource!, id: "csv-2", fileHeaders: ["adm2"] },
      ],
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(
      relations.map((relation) => {
        return relation.sourceMetadata;
      }),
    ).toEqual([
      { name: "movement-range-maps", resources: [rawCsv1] },
      { name: "movement-range-maps", resources: [rawCsv2] },
    ]);
  });

  it("leaves out the package fields a listing column already holds, and keeps only the identifying keys of its organization, tags, and groups", async () => {
    const ckanPackage: CkanPackage = {
      ..._packageWithOneCsv({ fileHeaders: ["adm1"] }),
      sourceRecord: {
        name: "movement-range-maps",
        notes: "Movement range maps.",
        caveats: "Counts are estimates.",
        methodology_other: "Census.",
        organization: {
          id: "org-1",
          name: "worldpop",
          title: "WorldPop",
          description: "A long description of the organization.",
          image_url: "https://example.com/logo.png",
        },
        tags: [
          {
            id: "tag-1",
            name: "population",
            display_name: "population",
            state: "active",
            vocabulary_id: "vocab-1",
          },
        ],
        groups: [
          {
            id: "fsm",
            name: "fsm",
            title: "Micronesia",
            description: "",
            image_display_url: "",
          },
        ],
        resources: [{ id: "csv-1", format: "CSV" }],
      },
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(relations[0]?.sourceMetadata).toEqual({
      name: "movement-range-maps",
      methodology_other: "Census.",
      organization: { id: "org-1", name: "worldpop", title: "WorldPop" },
      tags: [{ name: "population", vocabulary_id: "vocab-1" }],
      groups: [{ name: "fsm", title: "Micronesia" }],
      resources: [{ id: "csv-1", format: "CSV" }],
    });
  });

  it("keeps an organization, tag, or group it cannot read as it is", async () => {
    const ckanPackage: CkanPackage = {
      ..._packageWithOneCsv({ fileHeaders: ["adm1"] }),
      sourceRecord: {
        name: "movement-range-maps",
        organization: null,
        tags: ["population"],
        groups: "none",
        resources: [{ id: "csv-1", format: "CSV" }],
      },
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(relations[0]?.sourceMetadata).toEqual({
      name: "movement-range-maps",
      organization: null,
      tags: ["population"],
      groups: "none",
      resources: [{ id: "csv-1", format: "CSV" }],
    });
  });

  it("keeps a raw package whose resource list it cannot read as it is", async () => {
    const sourceRecord = { name: "movement-range-maps", resources: "none" };
    const ckanPackage: CkanPackage = {
      ..._packageWithOneCsv({ fileHeaders: ["adm1"] }),
      sourceRecord,
    };

    const relations = await makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      mappedFields: MAPPED_FIELDS,
      ckanPackage,
      scope: CSV_SCOPE,
      readFileColumns: _readSniffedColumns,
      metrics: _metrics().metrics,
    });

    expect(relations[0]?.sourceMetadata).toEqual(sourceRecord);
  });
});
