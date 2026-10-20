import type { Input } from "./ParcelSetbackInset.schema";
/** Data for makeParcelEnvelopeGeometryFromParcel. */
type CreateParcelEnvelopeGeometryResult = {
  original: { x: number; y: number; width: number; height: number };
  inset: { x: number; y: number; width: number; height: number };
  finalWidth: number;
  finalHeight: number;
};

/**
 * Projects original and animated inset rectangles once for shapes and
 * dimensions.
 */
export function makeParcelEnvelopeGeometryFromParcel({
  parcel,
  setback,
  progress,
}: Readonly<{
  parcel: Input["parcels"][number];
  setback: number;
  progress: number;
}>): CreateParcelEnvelopeGeometryResult {
  const insetX = Math.min(setback * progress, parcel.width / 2);
  const insetY = Math.min(setback * progress, parcel.height / 2);
  const original = {
    x: 70 + parcel.x * 4.8,
    y: 160 + parcel.y * 2.8,
    width: parcel.width * 4.8,
    height: parcel.height * 2.8,
  };
  return {
    original,
    inset: {
      x: original.x + insetX * 4.8,
      y: original.y + insetY * 2.8,
      width: (parcel.width - 2 * insetX) * 4.8,
      height: (parcel.height - 2 * insetY) * 2.8,
    },
    finalWidth: Math.max(0, parcel.width - 2 * setback),
    finalHeight: Math.max(0, parcel.height - 2 * setback),
  };
}
/** Shared projected geometry for a parcel's drawing and dimension witnesses. */
export type ParcelEnvelopeGeometry = ReturnType<
  typeof makeParcelEnvelopeGeometryFromParcel
>;
