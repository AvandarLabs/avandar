import { useState } from "react";

type PdfPoint = { x: number; y: number };

/**
 * Draft state for two-point y-axis calibration on one region.
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
      return currentPoints.length >= 2 ?
          currentPoints
        : [...currentPoints, point];
    });
  };

  return { regionId, points, start, cancel, pick };
}
