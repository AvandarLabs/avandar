import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { SaveStateIndicator } from "@/views/GisApp/shell/MapTopBar/SaveStateIndicator/SaveStateIndicator";
import type { MapSaveState } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";

const saveStateCases: ReadonlyArray<{
  saveState: MapSaveState;
  label: string;
}> = [
  { saveState: "saved", label: "All changes saved" },
  { saveState: "saving", label: "Saving" },
  { saveState: "unsaved", label: "Unsaved changes" },
  {
    saveState: "failed",
    label: "Could not save. Your last change is still on screen.",
  },
];

describe("SaveStateIndicator", () => {
  it.each(saveStateCases)(
    "shows the $saveState status without an alert interruption",
    ({ saveState, label }) => {
      render(<SaveStateIndicator saveState={saveState} />);

      expect(screen.getByRole("status", { name: label })).toHaveTextContent(
        label,
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
});
