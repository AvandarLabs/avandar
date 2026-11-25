import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  GENDER,
  LINKED_ONLY_TARGETS,
  makeApplyFlow,
  makeApplyLookups,
  NYS,
  SEX_ENTRY,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { MatchColumnsStep } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const SEX_MATCH: DictionaryMatch.T = {
  dictionaryId: NYS,
  dictionaryRank: 0,
  entryId: SEX_ENTRY.id,
  entryName: "sex",
  position: 0,
  codeListId: SEX_LIST.id,
  codeListName: "Sex (1/2/9)",
  coverage: 1,
  direction: "decode",
  fit: "fits",
  score: 1,
};

function _flow(
  dictionaryCount: number,
  overrides: Partial<ApplyFlow> = {},
): ApplyFlow {
  const dictionaryIds = Array.from({ length: dictionaryCount }, (_, index) => {
    return (index === 0 ? NYS : `dict-${index}`) as DataDictionary.Id;
  });
  const flow = makeApplyFlow({
    rows: [{ column: GENDER, profile: undefined, matches: [SEX_MATCH] }],
    ...overrides,
  });
  return {
    ...flow,
    state: { ...flow.state, ...overrides.state, dictionaryIds },
  };
}

function _render(flow: ApplyFlow): void {
  const dictionaries = (flow.state.dictionaryIds ?? []).map((id) => {
    return { id, name: id === NYS ? "NYS codes" : `Codes ${id}` };
  }) as DataDictionary.T[];
  render(
    <MatchColumnsStep
      flow={flow}
      dataset={{ id: "dataset-1", name: "Bronx line list" } as never}
      dictionaries={dictionaries}
      lookups={makeApplyLookups()}
      summary="1 converted"
      preview={null}
    />,
  );
}

describe("MatchColumnsStep", () => {
  it("picks a dictionary's match for a column", () => {
    const flow = _flow(1, {
      state: { ...makeApplyFlow().state, picks: {} },
    });
    _render(flow);

    fireEvent.click(
      screen.getByRole("button", { name: /sex · Sex \(1\/2\/9\)/ }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "toggle_pick",
      columnId: GENDER.id,
      pick: {
        dictionaryId: NYS,
        entryId: SEX_MATCH.entryId,
        codeListId: SEX_MATCH.codeListId,
        direction: "decode",
        mode: "reference",
        isDirectionFromData: true,
        keepsOriginal: false,
      },
    });
  });

  it("switches a converted row to reference only from its chip", () => {
    const flow = _flow(1);
    _render(flow);

    const chip = screen.getByRole("button", { name: "Convert" });
    expect(chip).toHaveAccessibleDescription(
      /GENDER.*Click to attach as reference only instead\./,
    );
    fireEvent.click(chip);

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "set_mode",
      columnId: GENDER.id,
      mode: "reference",
    });
  });

  it("shows every column converting, and attaches every dictionary as reference", () => {
    const flow = _flow(1);
    _render(flow);

    const forEvery = screen.getByRole("radiogroup", {
      name: "For every column",
    });
    expect(
      within(forEvery).getByRole("radio", { name: "Convert all" }),
    ).toBeChecked();
    fireEvent.click(
      within(forEvery).getByRole("radio", {
        name: "Attach dictionaries only as references",
      }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "set_all_modes",
      mode: "reference",
    });
  });

  it("explains, and does nothing, when the dataset cannot be converted", () => {
    const flow = _flow(1, {
      targets: {
        ...LINKED_ONLY_TARGETS,
        linked: { isAvailable: false, reason: "not_admin" },
      },
      state: {
        ...makeApplyFlow().state,
        picks: { [GENDER.id]: { ...SEX_PICK, mode: "reference" } },
      },
    });
    _render(flow);

    expect(screen.getByRole("radio", { name: "Convert all" })).toBeDisabled();
    expect(
      screen.getByRole("radio", {
        name: "Attach dictionaries only as references",
      }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Reference only" }));

    expect(flow.dispatch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Reference only" }),
    ).toHaveAccessibleDescription(/only workspace admins can add datasets/);
  });

  it("shows the selected column, and how to apply its dictionary, in the side panel", () => {
    _render(_flow(1));

    const pane = screen.getByRole("region", { name: "Selected column" });
    expect(pane.closest("#apply-dictionaries-pairing-table")).toBeNull();
    expect(
      within(pane).getByRole("button", { name: "Apply conversions" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("uses one Select per column past three dictionaries, still with a chip", () => {
    _render(_flow(4));

    expect(
      screen.getByRole("combobox", { name: "Entry to apply to GENDER" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert" })).toBeInTheDocument();
  });

  it("moves on to unmatched values", () => {
    const flow = _flow(1);
    _render(flow);

    fireEvent.click(
      screen.getByRole("button", { name: "Next: unmatched values" }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "go_to_step",
      step: "unmatched",
    });
  });

  it("says whether the columns with no match are shown", () => {
    _render(_flow(1));

    expect(
      screen.getByRole("button", { name: "Show 1 column with no match" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("names a picked entry that is not the dictionary's top match", () => {
    const genderMatch: DictionaryMatch.T = {
      ...SEX_MATCH,
      entryId: "entry-gender" as DataDictionaryEntry.Id,
      entryName: "gender",
      codeListName: "Gender (M/F)",
      score: 0.6,
    };
    _render(
      _flow(1, {
        rows: [
          {
            column: GENDER,
            profile: undefined,
            matches: [SEX_MATCH, genderMatch],
          },
        ],
        state: {
          ...makeApplyFlow().state,
          picks: { [GENDER.id]: { ...SEX_PICK, entryId: genderMatch.entryId } },
        },
      }),
    );

    expect(
      screen.getByRole("button", { name: /gender · Gender \(M\/F\)/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
