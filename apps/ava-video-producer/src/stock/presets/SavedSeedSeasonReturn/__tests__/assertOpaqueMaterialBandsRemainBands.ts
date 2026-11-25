import assert from "node:assert/strict";

/**
 * Asserts opaque material bands remain disjoint and visible across
 * fractional transfers.
 */
export function assertOpaqueMaterialBandsRemainBands(
  bands: Readonly<
    Array<{
      x: number;
      y: number;
      w: number;
      h: number;
    }>
  >,
): void {
  assert.ok(
    Math.abs(
      bands.reduce((sum, band) => {
        return sum + band.w;
      }, 0) - 180,
    ) < 1e-9,
  );
  bands
    .filter((band) => {
      return band.w > 0;
    })
    .forEach((a, index, nonempty) => {
      assert.ok(
        a.x >= 48 && a.x + a.w <= 928 && a.y >= 250 && a.y + a.h <= 410,
      );
      nonempty.slice(index + 1).forEach((b) => {
        return assert.ok(
          a.x + a.w <= b.x + 1e-9 ||
            b.x + b.w <= a.x + 1e-9 ||
            a.y + a.h <= b.y + 1e-9 ||
            b.y + b.h <= a.y + 1e-9,
        );
      });
    });
}
