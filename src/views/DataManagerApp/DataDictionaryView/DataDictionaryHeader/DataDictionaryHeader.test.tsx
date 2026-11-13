import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DataDictionaryHeader } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const mocks = vi.hoisted(() => {
  return {
    currentUserId: "" as string,
    dataSourcesRole: "editor" as string,
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: mocks.currentUserId, email: "someone@example.com" };
    },
  };
});
vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return {
    useUserAppRoles: () => {
      return [{ data_sources: mocks.dataSourcesRole }, false];
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/DataDictionaryActionsMenu",
  () => {
    return {
      DataDictionaryActionsMenu: () => {
        return <button type="button">Dictionary actions</button>;
      },
    };
  },
);

vi.mock(
  "@/views/DataManagerApp/DataDictionaryView/ApplyToDatasetButton/ApplyToDatasetButton",
  () => {
    return {
      ApplyToDatasetButton: () => {
        return <button type="button">Apply to a dataset</button>;
      },
    };
  },
);

vi.mock(
  "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryNameField",
  () => {
    return {
      DataDictionaryNameField: () => {
        return <span>Name field</span>;
      },
    };
  },
);

const DICTIONARY = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Measles",
  ownerId: OWNER_ID,
  version: 1,
  updatedAt: "2026-01-02T00:00:00Z",
} as unknown as DataDictionary.T;

function _renderHeader(): void {
  render(
    <DataDictionaryHeader
      dictionary={DICTIONARY}
      draft={{ entries: [], codeLists: [] }}
      canEdit={false}
      usedByCount={2}
    />,
  );
}

function _renderEditableHeader(): void {
  render(
    <DataDictionaryHeader
      dictionary={DICTIONARY}
      draft={{ entries: [], codeLists: [] }}
      canEdit
      usedByCount={2}
    />,
  );
}

describe("DataDictionaryHeader delete access", () => {
  beforeEach(() => {
    mocks.currentUserId = OTHER_ID;
    mocks.dataSourcesRole = "editor";
  });

  it("shows the actions menu to the owner", () => {
    mocks.currentUserId = OWNER_ID;
    _renderEditableHeader();
    expect(
      screen.getByRole("button", { name: "Dictionary actions" }),
    ).toBeInTheDocument();
  });

  it("shows the actions menu to a Data Sources admin who is not the owner", () => {
    mocks.dataSourcesRole = "admin";
    _renderEditableHeader();
    expect(
      screen.getByRole("button", { name: "Dictionary actions" }),
    ).toBeInTheDocument();
  });

  it("hides the actions menu from an editor who is not the owner", () => {
    _renderEditableHeader();
    expect(
      screen.queryByRole("button", { name: "Dictionary actions" }),
    ).not.toBeInTheDocument();
  });

  it("hides the actions menu from someone who cannot edit", () => {
    mocks.currentUserId = OWNER_ID;
    _renderHeader();
    expect(
      screen.queryByRole("button", { name: "Dictionary actions" }),
    ).not.toBeInTheDocument();
  });
});

describe("DataDictionaryHeader use", () => {
  beforeEach(() => {
    mocks.currentUserId = OWNER_ID;
    mocks.dataSourcesRole = "editor";
  });

  it("says how many datasets use the dictionary", () => {
    _renderHeader();
    expect(screen.getByText(/Used by 2 datasets/)).toBeInTheDocument();
  });

  it("offers Apply to a dataset to someone who can edit datasets", () => {
    _renderHeader();
    expect(
      screen.getByRole("button", { name: "Apply to a dataset" }),
    ).toBeInTheDocument();
  });

  it("does not offer it to a Data Sources viewer", () => {
    mocks.dataSourcesRole = "viewer";
    _renderHeader();
    expect(
      screen.queryByRole("button", { name: "Apply to a dataset" }),
    ).toBeNull();
  });
});
