import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Layers and config of the sites, buffer, and schools feature list fixture. */
export type SitesAndSchoolsFixture = {
  config: AvaMapConfig.T;
  sites: MapLayer.Standard;
  buffer: MapLayer.T;
  schools: MapLayer.T;
};

function _makeDataset(name: string): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

function _makeQueryColumn(dataset: Dataset.T, name: string): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: dataset.id,
      workspaceId: dataset.workspaceId,
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

/** A latitude and longitude layer whose popup shows its name column. */
function _makePointLayer(name: string, nameColumn: string): MapLayer.Standard {
  const dataset = _makeDataset(name);
  const label = _makeQueryColumn(dataset, nameColumn);
  const latitude = _makeQueryColumn(dataset, "latitude");
  const longitude = _makeQueryColumn(dataset, "longitude");
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [label, latitude, longitude],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
    popup: { columnIds: [label.id], action: undefined },
  };
}

/**
 * Sites, a half-mile buffer of the sites labelled by `site_name`, and
 * schools filtered by that buffer, as one map config. Use it in feature list
 * tests that need a buffer-filtered layer.
 */
export function createSitesAndSchoolsFixture(
  schoolSensitivity: MapLayer.Sensitivity = { mode: "exact" },
): SitesAndSchoolsFixture {
  const sites = _makePointLayer("Sites", "site_name");
  const buffer: MapLayer.T = {
    ...MapLayer.createArea("Buffer of Sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: sites.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: sites.source.queryColumns[0]?.id,
      dissolve: false,
    },
  };
  const schools = MapLayer.withSensitivity(
    {
      ..._makePointLayer("Schools", "school_name"),
      spatialFilter: { layerId: buffer.id },
    },
    schoolSensitivity,
  );
  return {
    config: { ...AvaMapConfig.makeEmpty(), layers: [sites, buffer, schools] },
    sites,
    buffer,
    schools,
  };
}
