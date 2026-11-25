import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  makeCrosswalkFlow,
  makeSeededState,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { CrosswalkNameField } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkNameField/CrosswalkNameField";

function _rename(
  flow: ReturnType<typeof makeCrosswalkFlow>,
  name: string,
): void {
  render(<CrosswalkNameField flow={flow} />);
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: `  ${name}  ` } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("CrosswalkNameField", () => {
  it("renames and saves a crosswalk that exists", () => {
    const seeded = makeSeededState();
    const flow = makeCrosswalkFlow({
      state: { ...seeded, draft: { ...seeded.draft, isSaved: true } },
    });

    _rename(flow, "Line lists");

    expect(flow.dispatchAndSave).toHaveBeenCalledWith({
      type: "renamed",
      name: "Line lists",
    });
    expect(flow.dispatch).not.toHaveBeenCalled();
  });

  it("only renames a new crosswalk, which saves with its first save", () => {
    const flow = makeCrosswalkFlow();

    _rename(flow, "Line lists");

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "renamed",
      name: "Line lists",
    });
    expect(flow.dispatchAndSave).not.toHaveBeenCalled();
  });
});
