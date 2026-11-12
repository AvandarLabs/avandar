import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const { insertMock, saveContentsMock, deleteMock, getByIdMock } = vi.hoisted(
  () => {
    return {
      insertMock: vi.fn(),
      saveContentsMock: vi.fn(),
      deleteMock: vi.fn(),
      getByIdMock: vi.fn(),
    };
  },
);

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        insert: insertMock,
        saveContents: saveContentsMock,
        delete: deleteMock,
        getById: getByIdMock,
      },
    };
  },
);

const { createDictionaryFromDraft, DictionaryLeftBehindError } =
  await import("./createDictionaryFromDraft");

const DICTIONARY_ID = uuid<DataDictionary.Id>();
const DATASET_ID = uuid<Dataset.Id>();
const OPTIONS = {
  workspaceId: uuid<Workspace.Id>(),
  owner: { userId: uuid<User.Id>(), profileId: uuid<UserProfile.Id>() },
  name: "Kings codes",
  description: "",
  datasetIds: [DATASET_ID],
  draft: { entries: [], codeLists: [] },
};

describe("createDictionaryFromDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ id: DICTIONARY_ID, name: "Kings codes" });
    deleteMock.mockResolvedValue(undefined);
    getByIdMock.mockResolvedValue(undefined);
  });

  it("creates the dictionary with its sources, then saves its contents into it", async () => {
    saveContentsMock.mockResolvedValue(2);
    await expect(createDictionaryFromDraft(OPTIONS)).resolves.toMatchObject({
      id: DICTIONARY_ID,
    });
    expect(insertMock.mock.calls[0]?.[0]?.data).toMatchObject({
      name: "Kings codes",
      description: undefined,
      createdFromDatasetIds: [DATASET_ID],
    });
    expect(saveContentsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dictionaryId: DICTIONARY_ID }),
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("removes the new dictionary and fails when its contents do not save", async () => {
    saveContentsMock.mockRejectedValue(new Error("save refused"));
    await expect(createDictionaryFromDraft(OPTIONS)).rejects.toThrow(
      "save refused",
    );
    expect(deleteMock).toHaveBeenCalledWith({ id: DICTIONARY_ID });
  });

  it("names the dictionary it could not remove when the delete is rejected", async () => {
    saveContentsMock.mockRejectedValue(new Error("save refused"));
    deleteMock.mockRejectedValue(new Error("delete refused"));
    const error = await createDictionaryFromDraft(OPTIONS).catch(
      (caught: unknown) => {
        return caught;
      },
    );
    expect(error).toBeInstanceOf(DictionaryLeftBehindError);
    expect(error).toMatchObject({ dictionaryName: "Kings codes" });
  });

  it("names the dictionary when the delete reports success but the row is still there", async () => {
    saveContentsMock.mockRejectedValue(new Error("save refused"));
    getByIdMock.mockResolvedValue({ id: DICTIONARY_ID });
    await expect(createDictionaryFromDraft(OPTIONS)).rejects.toBeInstanceOf(
      DictionaryLeftBehindError,
    );
    expect(getByIdMock).toHaveBeenCalledWith({ id: DICTIONARY_ID });
  });
});
