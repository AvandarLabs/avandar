import { expect } from "@playwright/test";

async function _assertAcknowledgedThemeDownload(
  getExportPayload: () => unknown,
): Promise<void> {
  await expect
    .poll(() => {
      return getExportPayload();
    })
    .toMatchObject({
      id: "shared-object-handoff",
      options: {
        theme: {
          id: "classic",
          patch: {
            other: {
              video: {
                atomic: { swatch: { customColorAccent: "#ff00ff" } },
                semantic: {
                  color: { accent: "$atomic.swatch.customColorAccent" },
                },
              },
            },
          },
        },
      },
    });
}
/** Download assertions for acknowledged design token previews. */
export const DesignTokenDownloads = {
  /** Waits until the export contains the theme acknowledged by the player. */
  assertAcknowledgedTheme: _assertAcknowledgedThemeDownload,
};
