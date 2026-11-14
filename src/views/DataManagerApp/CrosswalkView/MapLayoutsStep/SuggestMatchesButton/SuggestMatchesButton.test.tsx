import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { SuggestMatchesButton } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/SuggestMatchesButton/SuggestMatchesButton";
import type { CrosswalkMeaningMatches } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useCrosswalkMeaningMatches/useCrosswalkMeaningMatches";

const READY: CrosswalkMeaningMatches = {
  availability: "online",
  canSuggest: true,
  status: "idle",
  foundCount: undefined,
  suggestMatches: vi.fn(),
};

function _render(overrides: Partial<CrosswalkMeaningMatches> = {}) {
  const meaningMatches = { ...READY, ...overrides };
  render(<SuggestMatchesButton meaningMatches={meaningMatches} />);
  return meaningMatches;
}

function _button(): HTMLElement {
  return screen.getByRole("button", { name: "Suggest matches" });
}

describe("SuggestMatchesButton", () => {
  it("asks for matches when pressed", () => {
    const meaningMatches = _render();

    fireEvent.click(_button());

    expect(meaningMatches.suggestMatches).toHaveBeenCalledTimes(1);
  });

  it("explains why it is off with no model", () => {
    _render({ availability: "unavailable", canSuggest: false });

    expect(_button()).toBeDisabled();
    expect(_button()).toHaveAccessibleDescription(
      "Suggestions need a connection or the offline model. Mapping still works.",
    );
  });

  it("explains why it is off after the user declined", () => {
    _render({ availability: "declined", canSuggest: false });

    expect(
      screen.getByText(
        "You chose not to send column names to the AI provider, so suggestions are off for this crosswalk. Mapping still works.",
      ),
    ).toBeInTheDocument();
  });

  it("says when nothing is left to match", () => {
    _render({ canSuggest: false });

    expect(_button()).toBeDisabled();
    expect(
      screen.getByText("Nothing is left to match in this dataset."),
    ).toBeInTheDocument();
  });

  it("says how many matches it found, or that it found none", () => {
    _render({ status: "done", foundCount: 2 });
    expect(
      screen.getByText("Found 2 more matches. They're marked Suggested."),
    ).toBeInTheDocument();
  });

  it("says it found none", () => {
    _render({ status: "done", foundCount: 0 });
    expect(screen.getByText("No other matches found.")).toBeInTheDocument();
  });

  it("says while it is looking, and when it could not finish", () => {
    _render({ status: "finding" });
    expect(
      screen.getByText("Looking for columns that mean the same thing"),
    ).toBeInTheDocument();
  });

  it("says when it could not finish", () => {
    _render({ status: "failed" });
    expect(
      screen.getByText(
        "Could not look for columns that mean the same thing. The matches here are by name and values.",
      ),
    ).toBeInTheDocument();
  });
});
