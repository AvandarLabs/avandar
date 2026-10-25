import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
/** Creates an ordered chain of buffers over a fixture source layer. */
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
        dissolve: false,
      },
    };
  });
}
