import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { renderHook, TestProviders } from "@/test-utils";
import { useSuggestLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestLabels";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

// Only the consent gate is replaced. The module that decides what can be
// sent is the real one, so these cases check its rules end to end.
vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: vi.fn() };
  },
);
vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return { PendingAcks: { consumeAckForText: vi.fn() } };
});

function _column(
  columnName: string,
  codes: readonly string[],
): ColumnProfile.T {
  return {
    datasetId: uuid<Dataset.Id>(),
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 400,
    nonNullCount: 400,
    distinctCount: codes.length,
    values: codes.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _render(proposal: DictionaryProposal.T) {
  const queryClient = new QueryClient();
  return renderHook(
    () => {
      return useSuggestLabels({
        proposal,
        readId: undefined,
        model: "online",
        requestReply: () => {
          return Promise.resolve(undefined);
        },
        dispatch: vi.fn(),
      });
    },
    {
      wrapper: (props: { children: ReactNode }) => {
        return (
          <TestProviders>
            <QueryClientProvider client={queryClient}>
              {props.children}
            </QueryClientProvider>
          </TestProviders>
        );
      },
    },
  );
}

function _firstCodeList(proposal: DictionaryProposal.T) {
  const [codeList] = DictionaryProposal.getCodings(proposal).codeLists;
  if (!codeList) {
    throw new Error("The proposal has no code lists.");
  }
  return codeList;
}

describe("useSuggestLabels block reasons without mocks", () => {
  it("blocks a column that names people", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("first_name", ["Ana", "Luis"]),
    ]);
    const { result } = _render(proposal);
    expect(result.current.getLabelsBlockReason(_firstCodeList(proposal))).toBe(
      "personal",
    );
  });

  it("blocks nothing for an ordinary coded column", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("GENDER", ["1", "2", "9"]),
    ]);
    const { result } = _render(proposal);
    expect(
      result.current.getLabelsBlockReason(_firstCodeList(proposal)),
    ).toBeUndefined();
  });
});
