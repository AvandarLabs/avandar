import { makeApiResourceRelationsFromCkanPackage } from "@pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage";
import { describe, expect, it } from "vitest";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";

const CKAN_DRIVE: HdxDrive = {
  baseUrl: "https://data.humdata.org",
  organizationName: "Humanitarian Data Exchange",
};

describe("makeApiResourceRelationsFromCkanPackage", () => {
  it("builds one relation per readable resource of the scope's format, dated by metadata_modified", () => {
    const ckanPackage: CkanPackage = {
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

    const relations = makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      ckanPackage,
      resourceFormat: "CSV",
    });

    expect(relations).toEqual([
      {
        kind: "api_resource",
        externalDatasetId: "movement-range-maps",
        apiResourceId: "csv-1",
        apiResourceFormat: "CSV",
        displayName: "data.csv",
        externalOrganizationName: "Humanitarian Data Exchange",
        sourceUpdatedAt: new Date("2025-11-19T10:29:46.280Z"),
      },
    ]);
  });

  it("returns no relations when the dataset has no readable resource", () => {
    const ckanPackage: CkanPackage = {
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
      makeApiResourceRelationsFromCkanPackage({
        drive: CKAN_DRIVE,
        ckanPackage,
        resourceFormat: "CSV",
      }),
    ).toEqual([]);
  });

  it("keeps only the scope's format, whatever the resource's case", () => {
    const ckanPackage: CkanPackage = {
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

    const relations = makeApiResourceRelationsFromCkanPackage({
      drive: CKAN_DRIVE,
      ckanPackage,
      resourceFormat: "Parquet",
    });

    expect(
      relations.map((relation) => {
        return [relation.apiResourceId, relation.apiResourceFormat];
      }),
    ).toEqual([["parquet-1", "PARQUET"]]);
  });
});
