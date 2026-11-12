import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const { insertMock, saveContentsMock, deleteMock } = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    saveContentsMock: vi.fn(),
    deleteMock: vi.fn(),
  };
});

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        insert: insertMock,
        saveContents: saveContentsMock,
        delete: deleteMock,
      },
    };
  },
);

const { createDictionaryFromDraft } =
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
});
