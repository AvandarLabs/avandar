import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { getLimitedAudienceMapNames } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/getLimitedAudienceMapNames/getLimitedAudienceMapNames";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const OPEN_MAP_ID = "00000000-0000-4000-8000-0000000000f1" as AvaMap.Id;
const HIDDEN_MAP_ID = "00000000-0000-4000-8000-0000000000f2" as AvaMap.Id;
const UNAVAILABLE_LABEL = "a map you cannot open";

function _makeMap(overrides: Partial<AvaMap.T>): AvaMap.T {
  return {
    id: OPEN_MAP_ID,
    name: "Open map",
    isRestricted: false,
    config: AvaMapConfig.makeEmpty(),
    ...overrides,
  } as AvaMap.T;
}

function _makeMapWithDataset(dataset: Dataset.T): AvaMap.T {
  const layer = createQueryableLayer();
  return _makeMap({
    name: "Schools",
    config: {
      ...AvaMapConfig.makeEmpty(),
      layers: [{ ...layer, source: { ...layer.source, dataSource: dataset } }],
    },
  });
}

function _getDataset(): Dataset.T {
  return createQueryableLayer().source.dataSource as Dataset.T;
}

describe("getLimitedAudienceMapNames", () => {
  it("names a restricted map", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMap({ name: "Case homes", isRestricted: true })],
        datasets: [],
        unavailableMapLabel: UNAVAILABLE_LABEL,
      }),
    ).toEqual(["Case homes"]);
  });

  it("names a map whose dataset is restricted", () => {
    const dataset = { ..._getDataset(), isRestricted: true };

    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMapWithDataset(dataset)],
        datasets: [dataset],
        unavailableMapLabel: UNAVAILABLE_LABEL,
      }),
    ).toEqual(["Schools"]);
  });

  it("names a map whose dataset the author cannot read", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMapWithDataset(_getDataset())],
        datasets: [],
        unavailableMapLabel: UNAVAILABLE_LABEL,
      }),
    ).toEqual(["Schools"]);
  });

  it("does not name a map whose datasets are all open", () => {
    const dataset = { ..._getDataset(), isRestricted: false };

    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMapWithDataset(dataset)],
        datasets: [dataset],
        unavailableMapLabel: UNAVAILABLE_LABEL,
      }),
    ).toEqual([]);
  });

  it("labels a map the author cannot read", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [HIDDEN_MAP_ID],
        maps: [],
        datasets: [],
        unavailableMapLabel: UNAVAILABLE_LABEL,
      }),
    ).toEqual([UNAVAILABLE_LABEL]);
  });

  it("names nothing when every map and dataset is open", () => {
    expect(
      getLimitedAudienceMapNames({
        mapIds: [OPEN_MAP_ID],
        maps: [_makeMap({})],
        datasets: [],
        unavailableMapLabel: UNAVAILABLE_LABEL,
      }),
    ).toEqual([]);
  });
});
