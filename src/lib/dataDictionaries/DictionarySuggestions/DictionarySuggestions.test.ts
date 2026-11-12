import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH,
  DictionarySuggestionsRequestSchema,
  getDictionarySuggestionsMaxTokens,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { uuid } from "$/lib/uuid";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { OFFLINE_CHAT_CONTEXT_WINDOW_SIZE } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const { decideMock, consumeAckMock } = vi.hoisted(() => {
  return { decideMock: vi.fn(), consumeAckMock: vi.fn() };
});

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: decideMock };
  },
);

vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return { PendingAcks: { consumeAckForText: consumeAckMock } };
});

// Fixed, since the order proposals read datasets in can depend on their ids.
const BRONX_ID = "00000000-0000-4000-8000-000000000001" as Dataset.Id;
const ERIE_ID = "00000000-0000-4000-8000-000000000002" as Dataset.Id;

function _column(
  columnName: string,
  codes: readonly string[] | undefined,
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  return {
    datasetId,
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 400,
    nonNullCount: 400,
    distinctCount: codes?.length ?? 400,
    values: codes?.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _firstCodeList(
  proposal: DictionaryProposal.T,
): DictionaryProposal.CodeList {
  const [codeList] = DictionaryProposal.getCodings(proposal).codeLists;
  if (!codeList) {
    throw new Error("The proposal has no code lists.");
  }
  return codeList;
}

const REQUEST = {
  task: "labels" as const,
  locale: "en",
  column: {
    name: "GENDER",
    otherNames: [],
    kind: "categorical" as const,
    values: ["1"],
  },
};

describe("DictionarySuggestions.getModelFromRuntimeState", () => {
  it.each([
    [
      {
        navigatorOnLine: true,
        isOfflineModeOn: true,
        isBundleDownloaded: true,
      },
      "on_device",
    ],
    [
      {
        navigatorOnLine: false,
        isOfflineModeOn: false,
        isBundleDownloaded: true,
      },
      "on_device",
    ],
    [
      {
        navigatorOnLine: false,
        isOfflineModeOn: false,
        isBundleDownloaded: false,
      },
      "unavailable",
    ],
    [
      {
        navigatorOnLine: true,
        isOfflineModeOn: false,
        isBundleDownloaded: false,
      },
      "online",
    ],
  ] as const)("runs suggestions %j on %s", (state, model) => {
    expect(DictionarySuggestions.getModelFromRuntimeState(state)).toBe(model);
  });
});

describe("DictionarySuggestions.requestReply", () => {
  it("asks the offline model, constrained to the labels JSON schema", async () => {
    const completeOnDevice = vi
      .fn()
      .mockResolvedValue({ text: '{"labels":[]}' });
    const post = vi.fn();
    const reply = await DictionarySuggestions.requestReply({
      model: "on_device",
      workspaceId: "workspace-id",
      request: REQUEST,
      post,
      completeOnDevice,
    });
    expect(reply).toBe('{"labels":[]}');
    expect(post).not.toHaveBeenCalled();
    expect(completeOnDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: LocalChatModel.OFFLINE_BUNDLE.answer,
        jsonSchema: expect.objectContaining({
          required: ["labels", "description"],
        }),
      }),
    );
  });

  it("gives the offline model a labels budget that grows with the codes", async () => {
    const completeOnDevice = vi
      .fn()
      .mockResolvedValue({ text: '{"labels":[]}' });
    const codes = Array.from({ length: 50 }, (_item, index) => {
      return String(index);
    });
    await DictionarySuggestions.requestReply({
      model: "on_device",
      workspaceId: "workspace-id",
      request: { ...REQUEST, column: { ...REQUEST.column, values: codes } },
      post: vi.fn(),
      completeOnDevice,
    });
    expect(completeOnDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: getDictionarySuggestionsMaxTokens({
          ...REQUEST,
          column: { ...REQUEST.column, values: codes },
        }),
      }),
    );
  });

  it("posts to the suggestions route online", async () => {
    const post = vi.fn().mockResolvedValue({ reply: '{"matches":[]}' });
    const reply = await DictionarySuggestions.requestReply({
      model: "online",
      ackToken: "ack-1",
      workspaceId: "workspace-id",
      request: REQUEST,
      post,
      completeOnDevice: vi.fn(),
    });
    expect(reply).toBe('{"matches":[]}');
    expect(post).toHaveBeenCalledWith({
      route: "chat/:workspaceId/dictionary-suggestions/:promptId",
      pathParams: {
        workspaceId: "workspace-id",
        promptId: "dictionary-suggestions-v1",
      },
      body: { request: REQUEST, ackToken: "ack-1" },
    });
  });
});

describe("DictionarySuggestions.approveRequest", () => {
  const WORKSPACE_ID = uuid<Workspace.Id>();
  const TEXT = stringifyDictionarySuggestionsRequest(REQUEST);

  beforeEach(() => {
    decideMock.mockReset();
    consumeAckMock.mockReset();
  });

  it("always asks on the first send and returns the consent's ack token", async () => {
    decideMock.mockResolvedValue({ approved: true, payload: { text: TEXT } });
    consumeAckMock.mockResolvedValue("ack-1");
    const ackToken = await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(ackToken).toBe("ack-1");
    expect(decideMock).toHaveBeenCalledWith({
      text: TEXT,
      values: ["1"],
      sourceColumn: "GENDER",
      context: "dictionary_suggestions",
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      explicitConsentRequired: true,
    });
    expect(consumeAckMock).toHaveBeenCalledWith(TEXT);
  });

  it("only asks again when something looks personal once the user agreed", async () => {
    decideMock.mockResolvedValue({ approved: true, payload: { text: TEXT } });
    consumeAckMock.mockResolvedValue("ack-2");
    await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: true,
    });
    expect(decideMock).toHaveBeenCalledWith(
      expect.objectContaining({ explicitConsentRequired: false }),
    );
  });

  it("treats a rewritten request as a decline and drops its ack", async () => {
    const rewritten = `${TEXT} `;
    decideMock.mockResolvedValue({
      approved: true,
      payload: { text: rewritten },
    });
    consumeAckMock.mockResolvedValue("ack-for-rewrite");
    const ackToken = await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(ackToken).toBeUndefined();
    expect(consumeAckMock).toHaveBeenCalledWith(rewritten);
  });

  it("returns nothing when the user declines", async () => {
    decideMock.mockResolvedValue({ approved: false, reason: "cancelled" });
    const ackToken = await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(ackToken).toBeUndefined();
    expect(consumeAckMock).not.toHaveBeenCalled();
  });
});

describe("DictionarySuggestions requests", () => {
  it("asks for one list's labels with the entry's names and codes", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("GENDER", ["1", "2", "9"]),
      _column("sex", ["M", "F", "U"], ERIE_ID),
    ]);
    const request = DictionarySuggestions.makeLabelsRequestFromCodeList({
      proposal,
      codeList: _firstCodeList(proposal),
      locale: "en",
      model: "online",
    });
    expect(request).toEqual({
      task: "labels",
      locale: "en",
      column: {
        name: "gender",
        otherNames: ["GENDER", "sex"],
        kind: "categorical",
        values: ["1", "2", "9"],
      },
    });
  });

  it("never sends the values of a column named after a person", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("first_name", ["Ana", "Luis"]),
    ]);
    expect(
      DictionarySuggestions.makeLabelsRequestFromCodeList({
        proposal,
        codeList: _firstCodeList(proposal),
        locale: "en",
        model: "online",
      }),
    ).toBeUndefined();
  });

  it("asks for meaning matches only across two or more datasets", () => {
    const single = DictionaryProposal.fromColumnProfiles([
      _column("vax_status", ["U", "P", "F"]),
      _column("case_id", undefined),
    ]);
    expect(
      DictionarySuggestions.makeMatchesRequestFromProposal({
        proposal: single,
        locale: "en",
        model: "online",
      }),
    ).toBeUndefined();
  });

  it("sends codes for coded entries only when asking for matches", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("vax_status", ["U", "P", "F"]),
      _column("case_id", undefined),
      _column("mmr_status", ["0", "1", "2"], ERIE_ID),
    ]);
    const request = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal,
      locale: "en",
      model: "online",
    });
    const valuesByName =
      request?.task === "matches"
        ? Object.fromEntries(
            request.columns.map((column) => {
              return [column.name, column.values];
            }),
          )
        : {};
    expect(valuesByName).toEqual({
      vax_status: ["U", "P", "F"],
      case_id: [],
      mmr_status: ["0", "1", "2"],
    });
  });

  it("drops columns from a matches request until the route would take it", () => {
    const profiles = Array.from({ length: 300 }, (_item, index) => {
      const datasetId = index % 2 === 0 ? BRONX_ID : ERIE_ID;
      const codes = Array.from({ length: 12 }, (_code, codeIndex) => {
        return `${"x".repeat(30)}_${index}_${codeIndex}`;
      });
      return _column(`coded_column_number_${index}`, codes, datasetId);
    });
    const request = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal: DictionaryProposal.fromColumnProfiles(profiles),
      locale: "en",
      model: "online",
    });
    expect(
      request && DictionarySuggestionsRequestSchema.safeParse(request).success,
    ).toBe(true);
  });

  it("sends no codes for a column that has one over the schema's limit", () => {
    const longCode = "x".repeat(DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH + 1);
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("vax_status", ["U", longCode]),
      _column("mmr_status", ["0", "1"], ERIE_ID),
    ]);
    const request = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal,
      locale: "en",
      model: "online",
    });
    expect(
      request && DictionarySuggestionsRequestSchema.safeParse(request).success,
    ).toBe(true);
    const valuesByName =
      request?.task === "matches"
        ? Object.fromEntries(
            request.columns.map((column) => {
              return [column.name, column.values];
            }),
          )
        : {};
    expect(valuesByName).toEqual({
      vax_status: [],
      mmr_status: ["0", "1"],
    });
  });

  it("asks for no labels when a code is over the schema's limit", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("vax_status", [
        "U",
        "x".repeat(DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH + 1),
      ]),
    ]);
    expect(
      DictionarySuggestions.makeLabelsRequestFromCodeList({
        proposal,
        codeList: _firstCodeList(proposal),
        locale: "en",
        model: "online",
      }),
    ).toBeUndefined();
  });

  it("keeps codes back when the identifying name is past the 50th other name", () => {
    const seed = DictionaryProposal.fromColumnProfiles([
      _column("status_0", ["Y", "N"]),
      _column("case_id", undefined, ERIE_ID),
    ]);
    // One entry that goes by 51 other names, the last of them identifying.
    const columns = Array.from({ length: 52 }, (_item, index) => {
      return _column(
        index === 51 ? "status_name" : `status_${index}`,
        ["Y", "N"],
        uuid<Dataset.Id>(),
      );
    });
    const proposal = {
      ...seed,
      entries: [{ ...seed.entries[0]!, columns }, seed.entries[1]!],
    };
    const request = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal,
      locale: "en",
      model: "online",
    });
    const sentValues =
      request?.task === "matches"
        ? request.columns[0]?.values
        : ["not a matches request"];
    expect(sentValues).toEqual([]);
  });
});

/** A pessimistic estimate: three characters per token, plus the reply. */
function _estimateOnDeviceTokens(
  request: Readonly<DictionarySuggestionsRequest>,
): number {
  const characters = buildDictionarySuggestionsMessages(request).reduce(
    (total, message) => {
      return total + message.content.length;
    },
    0,
  );
  return Math.ceil(characters / 3) + getDictionarySuggestionsMaxTokens(request);
}

describe("DictionarySuggestions requests on the offline model", () => {
  it("drops codes before columns so a matches request fits the context window", () => {
    const profiles = Array.from({ length: 60 }, (_item, index) => {
      const codes = Array.from({ length: 12 }, (_code, codeIndex) => {
        return `${"x".repeat(30)}_${index}_${codeIndex}`;
      });
      return _column(
        `coded_column_number_${index}`,
        codes,
        index % 2 === 0 ? BRONX_ID : ERIE_ID,
      );
    });
    const proposal = DictionaryProposal.fromColumnProfiles(profiles);
    const online = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal,
      locale: "en",
      model: "online",
    });
    const onDevice = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal,
      locale: "en",
      model: "on_device",
    });
    expect(online && _estimateOnDeviceTokens(online)).toBeGreaterThan(
      OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    );
    expect(onDevice && _estimateOnDeviceTokens(onDevice)).toBeLessThanOrEqual(
      OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    );
    expect(onDevice?.task === "matches" && onDevice.columns).toHaveLength(60);
  });

  it("asks for no labels when the list cannot fit the context window", () => {
    const seed = DictionaryProposal.fromColumnProfiles([
      _column("status_0", ["Y", "N"]),
    ]);
    // One entry that goes by 50 other names of 190 characters each.
    const columns = Array.from({ length: 51 }, (_item, index) => {
      return _column(
        `status_${index}_${"n".repeat(180)}`,
        ["Y", "N"],
        uuid<Dataset.Id>(),
      );
    });
    const proposal = {
      ...seed,
      entries: [{ ...seed.entries[0]!, columns }],
    };
    // A code list of 50 codes, 150 characters each.
    const codeList = {
      ..._firstCodeList(proposal),
      values: Array.from({ length: 50 }, (_code, index) => {
        return { value: `${"c".repeat(150)}_${index}`, rowCount: 1 };
      }),
    } as DictionaryProposal.CodeList;
    const options = { proposal, codeList, locale: "en" };
    expect(
      DictionarySuggestions.makeLabelsRequestFromCodeList({
        ...options,
        model: "online",
      }),
    ).toBeDefined();
    expect(
      DictionarySuggestions.makeLabelsRequestFromCodeList({
        ...options,
        model: "on_device",
      }),
    ).toBeUndefined();
  });
});
