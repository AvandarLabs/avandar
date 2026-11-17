import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen, within } from "@/test-utils";
import { LabelValuesStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const DATASET_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[],
): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value, index) => {
      return { value, rowCount: 120 - index * 10 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("GENDER", ["1", "2", "9"]),
  _column("county", ["Bronx", "Kings"]),
]);
const CODE_LISTS = DictionaryProposal.getCodings(PROPOSAL).codeLists;
const LABELS = DictionaryProposal.withDefaultLabels({}, CODE_LISTS);
const GENDER_LIST = CODE_LISTS[0];

const SUGGESTED_LABELS = DictionaryProposal.applyLabelSuggestions(LABELS, {
  codeListKey: GENDER_LIST?.key ?? "",
  suggestions: {
    labels: [{ value: "1", label: "Male", isMissing: false }],
    description: "",
  },
});

/** Selects the next list when the step asks to accept the current one. */
function SteppingHarness(): JSX.Element {
  const [selectedKey, setSelectedKey] = useState(GENDER_LIST?.key);
  return (
    <LabelValuesStep
      proposal={PROPOSAL}
      labels={LABELS}
      selectedCodeListKey={selectedKey}
      suggestionAvailability="online"
      suggestingCodeListKey={undefined}
      getLabelsBlockReason={() => {
        return undefined;
      }}
      dispatch={(action) => {
        if (action.type === "accept_code_list") {
          setSelectedKey(CODE_LISTS[1]?.key);
        }
      }}
      onSuggest={vi.fn()}
    />
  );
}

function _renderStep(
  suggestionAvailability: DictionarySuggestionAvailability = "online",
  blockReason: LabelsBlockReason | undefined = undefined,
  suggestingCodeListKey: string | undefined = undefined,
) {
  const dispatch = vi.fn();
  const onSuggest = vi.fn();
  render(
    <LabelValuesStep
      proposal={PROPOSAL}
      labels={LABELS}
      selectedCodeListKey={GENDER_LIST?.key}
      suggestionAvailability={suggestionAvailability}
      suggestingCodeListKey={suggestingCodeListKey}
      getLabelsBlockReason={() => {
        return blockReason;
      }}
      dispatch={dispatch}
      onSuggest={onSuggest}
    />,
  );
  return { dispatch, onSuggest };
}

describe("LabelValuesStep", () => {
  it("heads the code list flank and counts how many are done", () => {
    _renderStep();
    expect(
      screen.getByRole("heading", { name: "Code lists to map" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
  });

  it("heads the values table with source and target values and an info icon for each", () => {
    _renderStep();
    expect(
      screen.getByRole("columnheader", { name: /Source value/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Target value/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What is a source value?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What is a target value?" }),
    ).toBeInTheDocument();
  });

  it("titles the selected list with a second level heading", () => {
    _renderStep();
    expect(
      screen.getByRole("heading", { level: 2, name: "gender (1/2/9)" }),
    ).toBeInTheDocument();
  });

  it("moves focus to the next list's title after Accept and next list", () => {
    render(<SteppingHarness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Accept and next list" }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "county (Bronx/Kings)" }),
    ).toHaveFocus();
  });

  it("describes a suggested label to screen readers on its own field", () => {
    render(
      <LabelValuesStep
        proposal={PROPOSAL}
        labels={SUGGESTED_LABELS}
        selectedCodeListKey={GENDER_LIST?.key}
        suggestionAvailability="online"
        suggestingCodeListKey={undefined}
        getLabelsBlockReason={() => {
          return undefined;
        }}
        dispatch={vi.fn()}
        onSuggest={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Target value for 1" }),
    ).toHaveAccessibleDescription("Suggested from the column name and values");
    expect(
      screen.getByRole("textbox", { name: "Target value for 2" }),
    ).not.toHaveAccessibleDescription();
  });

  it("lists each code list with how far along it is", () => {
    _renderStep();
    const nav = screen.getByRole("navigation", { name: "Code lists to map" });
    expect(
      within(nav).getByRole("button", { name: /gender \(1\/2\/9\).*To do/ }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("button", {
        name: /county \(Bronx\/Kings\).*Mapped/,
      }),
    ).toBeInTheDocument();
  });

  it("types a label for a value", () => {
    const { dispatch } = _renderStep();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Target value for 1" }),
      {
        target: { value: "Male" },
      },
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_value_label",
      codeListKey: GENDER_LIST?.key,
      code: "1",
      label: "Male",
    });
  });

  it("marks a value as a missing answer", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "9 stands for a missing answer" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_value_missing",
      codeListKey: GENDER_LIST?.key,
      code: "9",
      isMissing: true,
    });
  });

  it("explains the Missing value column to someone who focuses its info icon", async () => {
    _renderStep();
    const infoButton = screen.getByRole("button", {
      name: "About missing values",
    });
    expect(
      within(
        screen.getByRole("columnheader", { name: /Missing value/ }),
      ).getByRole("button", { name: "About missing values" }),
    ).toBe(infoButton);
    fireEvent.focus(infoButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Your data isn't changed.",
    );
  });

  it("asks for suggestions for the selected list", () => {
    const { onSuggest } = _renderStep();
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest target values" }),
    );
    expect(onSuggest).toHaveBeenCalledWith(GENDER_LIST);
  });

  it("turns Suggest target values off while another list's suggestion is pending", () => {
    _renderStep("online", undefined, CODE_LISTS[1]?.key);
    expect(
      screen.getByRole("button", { name: "Suggest target values" }),
    ).toBeDisabled();
  });

  it("says suggestions cover only the first 50 values of a longer list", () => {
    const wide = DictionaryProposal.fromColumnProfiles([
      {
        ..._column(
          "county_code",
          Array.from({ length: 51 }, (_code, index) => {
            return `c${index}`;
          }),
        ),
      },
    ]);
    const [entry] = wide.entries;
    const proposal = DictionaryProposal.setEntryKind(wide, {
      entryKey: entry?.key ?? "",
      kind: "categorical",
    });
    const [codeList] = DictionaryProposal.getCodings(proposal).codeLists;
    render(
      <LabelValuesStep
        proposal={proposal}
        labels={DictionaryProposal.withDefaultLabels({}, [codeList!])}
        selectedCodeListKey={codeList?.key}
        suggestionAvailability="online"
        suggestingCodeListKey={undefined}
        getLabelsBlockReason={() => {
          return undefined;
        }}
        dispatch={vi.fn()}
        onSuggest={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Suggestions cover the first 50 values."),
    ).toBeInTheDocument();
  });

  it("does not mention the cap on a list of 50 values or fewer", () => {
    _renderStep();
    expect(screen.queryByText(/Suggestions cover the first/)).toBeNull();
  });

  it("explains that suggestions are off when no model is available", () => {
    _renderStep("unavailable");
    expect(
      screen.getByRole("button", { name: "Suggest target values" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Suggestions need a connection or the offline model. You can still map values yourself.",
      ),
    ).toBeInTheDocument();
  });

  it("explains that suggestions are off when the user declined to send them", () => {
    _renderStep("declined");
    expect(
      screen.getByRole("button", { name: "Suggest target values" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "You chose not to send values to the AI provider, so suggestions are off for this dictionary. You can still map values yourself.",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "personal",
      "These columns look like they name people, so their values are not sent for suggestions.",
    ],
    [
      "code_too_long",
      "A value in this list is too long to send for suggestions. You can still map values yourself.",
    ],
    [
      "too_large_for_model",
      "This list is too long to suggest target values for in one request. You can still map values yourself.",
    ],
  ] as const)(
    "explains why a list that cannot be sent for %s is not",
    (reason, message) => {
      _renderStep("online", reason);
      expect(
        screen.getByRole("button", { name: "Suggest target values" }),
      ).toBeDisabled();
      expect(screen.getByText(message)).toBeInTheDocument();
    },
  );

  it("accepts the list and moves to the next one", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(
      screen.getByRole("button", { name: "Accept and next list" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "accept_code_list",
      codeListKey: GENDER_LIST?.key,
    });
  });
});
