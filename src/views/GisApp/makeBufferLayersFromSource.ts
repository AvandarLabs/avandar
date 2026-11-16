import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
/**
 * Creates `bufferDepth` map layers that each buffer the one before, with the
 * first buffering the `sourceId` layer, so a test can check that a source's
 * readiness reaches every layer in a buffer chain. Used by `_createFixture`
 * in the map source readiness tests.
 */
export function makeBufferLayersFromSource({
  sourceId,
  bufferDepth,
}: Readonly<{ sourceId: MapLayer.Id; bufferDepth: number }>): MapLayer.T[] {
  const buffers = Array.from({ length: bufferDepth }, (_, index) => {
    return MapLayer.makeEmpty(`buffer ${index}`);
  });
  return buffers.map((buffer, index) => {
    return {
      ...buffer,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: buffers[index - 1]?.id ?? sourceId,
        distanceMeters: 100,
        distanceUnit: "m",
        labelColumn: undefined,
        dissolve: false,
      },
    };
  });
}
