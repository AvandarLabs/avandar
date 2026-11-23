import { Checkbox } from "@mantine/core";
import type { useCompositionAppearance } from "../../useCompositionAppearance/useCompositionAppearance";
import type { ReactNode } from "react";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };
const APPEARANCE_LABELS = {
  cameraMotion: "Camera motion",
  motionBlur: "Motion blur",
  annotations: "Annotations",
  captions: "Captions",
} as const;

/** Render each continuity switch in its authored order. */
export function AppearanceToggles({ appearance }: Readonly<Props>): ReactNode {
  return (
    <>
      {(["cameraMotion", "motionBlur", "annotations", "captions"] as const).map(
        (key) => {
          return (
            <Checkbox
              key={key}
              size="xs"
              label={APPEARANCE_LABELS[key]}
              checked={appearance.draft[key]}
              onChange={(event) => {
                return appearance.update({
                  [key]: event.currentTarget.checked,
                });
              }}
            />
          );
        },
      )}
    </>
  );
}
