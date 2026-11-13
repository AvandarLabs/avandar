import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadColumnCodes } from "@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes";
import type { Workspace } from "$/models/Workspace/Workspace";

const { bindingsMock, dictionariesMock, entriesMock, codeListsMock } =
  vi.hoisted(() => {
    return {
      bindingsMock: vi.fn(),
      dictionariesMock: vi.fn(),
      entriesMock: vi.fn(),
      codeListsMock: vi.fn(),
    };
  });

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return { DictionaryBindingClient: { getAll: bindingsMock } };
});
vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return { DataDictionaryClient: { getAll: dictionariesMock } };
  },
);
vi.mock("@/clients/dataDictionaries/DataDictionaryEntryClient", () => {
  return { DataDictionaryEntryClient: { getAll: entriesMock } };
});
vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return { DataDictionaryCodeListClient: { getAll: codeListsMock } };
});

const WORKSPACE_ID = "workspace-1" as Workspace.Id;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadColumnCodes", () => {
  it("reads nothing else when no column is bound", async () => {
    bindingsMock.mockResolvedValue([]);

    const codes = await loadColumnCodes(WORKSPACE_ID);

    expect(codes.size).toBe(0);
    expect(dictionariesMock).not.toHaveBeenCalled();
  });

  it("joins each binding to its dictionary, entry, and code list", async () => {
    bindingsMock.mockResolvedValue([
      {
        datasetColumnId: "col-gender",
        dictionaryId: "dict-1",
        entryId: "entry-sex",
        codeListId: "list-sex",
        mode: "reference",
        direction: "decode",
      },
    ]);
    dictionariesMock.mockResolvedValue([{ id: "dict-1", name: "NYS codes" }]);
    entriesMock.mockResolvedValue([
      { id: "entry-sex", name: "sex", description: undefined },
    ]);
    codeListsMock.mockResolvedValue([
      {
        id: "list-sex",
        name: "Sex (1/2/9)",
        isOrdered: false,
        pairs: [
          { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
        ],
      },
    ]);

    const codes = await loadColumnCodes(WORKSPACE_ID);

    expect(codes.get("col-gender")?.codeListName).toBe("Sex (1/2/9)");
    expect(codeListsMock).toHaveBeenCalledWith({
      where: { id: { in: ["list-sex"] } },
    });
  });

  it("gives no codes when the bindings cannot be read", async () => {
    bindingsMock.mockRejectedValue(new Error("Failed to fetch"));

    await expect(loadColumnCodes(WORKSPACE_ID)).resolves.toEqual(new Map());
  });
});
