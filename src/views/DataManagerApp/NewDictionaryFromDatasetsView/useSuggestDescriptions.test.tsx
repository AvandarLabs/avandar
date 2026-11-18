import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { useSuggestDescriptions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestDescriptions";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ProposalReadId } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ReactNode } from "react";

const { notifyErrorMock, notifySuccessMock } = vi.hoisted(() => {
  return { notifyErrorMock: vi.fn(), notifySuccessMock: vi.fn() };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: notifyErrorMock, notifySuccess: notifySuccessMock };
});

const DATASET_ID = uuid<Dataset.Id>();
const READ_ID = uuid<ProposalReadId>();

function _column(columnName: string): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings line list",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: 250,
    values: undefined,
    dateShare: undefined,
    numberRange: undefined,
  };
}

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("clinic_notes"),
  _column("visit_summary"),
  _column("triage_comment"),
]);
const [NOTES, SUMMARY, TRIAGE] = PROPOSAL.entries.map((entry) => {
  return entry.key;
}) as [string, string, string];

function _reply(description: string): string {
  return JSON.stringify({ description });
}

function _wrapper(props: { children: ReactNode }): JSX.Element {
  return <TestProviders>{props.children}</TestProviders>;
}

function _render(
  requestReply: (request: unknown) => Promise<string | undefined>,
  proposal: DictionaryProposal.T = PROPOSAL,
) {
  const dispatch = vi.fn();
  const rendered = renderHook(
    () => {
      return useSuggestDescriptions({
        proposal,
        readId: READ_ID,
        requestReply,
        dispatch,
      });
    },
    { wrapper: _wrapper },
  );
  return { ...rendered, dispatch };
}

describe("useSuggestDescriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks about one entry with the description the user wrote and fills the answer in", async () => {
    const typed = DictionaryProposal.setEntryDescription(PROPOSAL, {
      entryKey: NOTES,
      description: "Free text the nurse wrote",
    });
    const requestReply = vi.fn().mockResolvedValue(_reply("Nurse notes."));
    const { result, dispatch } = _render(requestReply, typed);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES],
        rewritableEntryKeys: [NOTES],
      });
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
    expect(requestReply).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "describe",
        description: "Free text the nurse wrote",
        column: expect.objectContaining({ name: "clinic_notes" }),
      }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "descriptions_suggested",
      readId: READ_ID,
      suggestions: [{ entryKey: NOTES, description: "Nurse notes." }],
      rewritableEntryKeys: [NOTES],
    });
  });

  it("marks only the entry being suggested as pending", async () => {
    let finish: (reply: string) => void = () => {};
    const requestReply = vi.fn().mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [SUMMARY],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.statusByEntryKey.get(SUMMARY)).toBe("pending");
    });
    expect(result.current.statusByEntryKey.has(NOTES)).toBe(false);
    expect(result.current.isSuggesting).toBe(true);
    finish(_reply("Visit summary."));
    await waitFor(() => {
      expect(result.current.isSuggesting).toBe(false);
    });
    expect(result.current.statusByEntryKey.size).toBe(0);
  });

  it("sends the listed entries one after another and skips the rest", async () => {
    const order: string[] = [];
    let inFlight = 0;
    let mostInFlight = 0;
    const requestReply = vi.fn(async (request: unknown) => {
      inFlight += 1;
      mostInFlight = Math.max(mostInFlight, inFlight);
      const name = (request as { column: { name: string } }).column.name;
      order.push(name);
      await Promise.resolve();
      inFlight -= 1;
      return _reply(`About ${name}.`);
    });
    const { result, dispatch } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES, TRIAGE],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(2);
    });
    expect(order).toEqual(["clinic_notes", "triage_comment"]);
    expect(mostInFlight).toBe(1);
  });

  it("marks an entry failed and goes on to the next when one answer does not come back", async () => {
    const requestReply = vi
      .fn()
      .mockRejectedValueOnce(new Error("The model is down"))
      .mockResolvedValueOnce(_reply("Triage comment."));
    const { result, dispatch } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES, TRIAGE],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.isSuggesting).toBe(false);
    });
    expect(result.current.statusByEntryKey.get(NOTES)).toBe("failed");
    expect(result.current.statusByEntryKey.has(TRIAGE)).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestions: [{ entryKey: TRIAGE, description: "Triage comment." }],
      }),
    );
  });

  it("marks an entry failed when the reply holds no description", async () => {
    const requestReply = vi.fn().mockResolvedValue("I am not sure.");
    const { result, dispatch } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.statusByEntryKey.get(NOTES)).toBe("failed");
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("clears a failure when the same entry is suggested again", async () => {
    const requestReply = vi
      .fn()
      .mockRejectedValueOnce(new Error("Down"))
      .mockResolvedValueOnce(_reply("Notes."));
    const { result } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.statusByEntryKey.get(NOTES)).toBe("failed");
    });
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.statusByEntryKey.size).toBe(0);
    });
  });

  it("fills nothing in and shows no failure when the user does not let a request go online", async () => {
    const requestReply = vi.fn().mockResolvedValue(undefined);
    const { result, dispatch } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.isSuggesting).toBe(false);
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(result.current.statusByEntryKey.size).toBe(0);
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("reports how far a run of several entries has got", async () => {
    let finish: (reply: string) => void = () => {};
    const requestReply = vi
      .fn()
      .mockResolvedValueOnce(_reply("One."))
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
      );
    const { result } = _render(requestReply);
    act(() => {
      result.current.suggestDescriptions({
        entryKeys: [NOTES, SUMMARY],
        rewritableEntryKeys: [],
      });
    });
    await waitFor(() => {
      expect(result.current.progress).toEqual({ done: 1, total: 2 });
    });
    finish(_reply("Two."));
    await waitFor(() => {
      expect(result.current.progress).toBeUndefined();
    });
  });
});
