import { useState } from "react";

type PdfPoint = { x: number; y: number };

/**
 * Manages a region's calibration draft, returning its selected points and
 * actions.
 * Use it, for example, when collecting two y-axis points for PDF calibration.
 */
export function usePdfAxisCalibration(): {
  regionId: string | null;
  points: readonly PdfPoint[];
  start: (regionId: string) => void;
  cancel: () => void;
  pick: (point: PdfPoint) => void;
} {
  const [regionId, setRegionId] = useState<string | null>(null);
  const [points, setPoints] = useState<readonly PdfPoint[]>([]);

  const start = (nextRegionId: string): void => {
    setRegionId(nextRegionId);
    setPoints([]);
  };

  const cancel = (): void => {
    setRegionId(null);
    setPoints([]);
  };

  const pick = (point: PdfPoint): void => {
    setPoints((currentPoints) => {
      return currentPoints.length >= 2
        ? currentPoints
        : [...currentPoints, point];
    });
  };

  return { regionId, points, start, cancel, pick };
}
