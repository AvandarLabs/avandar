import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import {
  CONTEXT,
  makeCrosswalkFlow,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { CrosswalkHeader } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkHeader";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const mocks = vi.hoisted(() => {
  return { currentUserId: "", dataSourcesRole: "editor" };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: mocks.currentUserId };
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
  "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkActionsMenu/CrosswalkActionsMenu",
  () => {
    return {
      CrosswalkActionsMenu: () => {
        return <button type="button">Crosswalk actions</button>;
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkNameField/CrosswalkNameField",
  () => {
    return {
      CrosswalkNameField: () => {
        return <span>Name field</span>;
      },
    };
  },
);

const CROSSWALK = {
  id: "crosswalk-1",
  name: "Measles line lists",
  ownerId: OWNER_ID,
} as unknown as Crosswalk.T;

function _renderHeader(crosswalk: Crosswalk.T | undefined): void {
  render(
    <CrosswalkHeader
      crosswalk={crosswalk}
      flow={makeCrosswalkFlow()}
      context={CONTEXT}
    />,
  );
}

describe("CrosswalkHeader", () => {
  beforeEach(() => {
    mocks.currentUserId = OWNER_ID;
    mocks.dataSourcesRole = "editor";
  });

  it("states what the crosswalk holds and its reference", () => {
    _renderHeader(CROSSWALK);
    // The facts share one paragraph, with the middots in their own spans.
    const facts = screen.getByText(/4 datasets/);
    expect(facts).toHaveTextContent("Crosswalk");
    expect(facts).toHaveTextContent("3 columns");
    expect(facts).toHaveTextContent("Reference: Bronx line list");
  });

  it("offers the actions menu to the owner and to a Data Sources admin", () => {
    _renderHeader(CROSSWALK);
    expect(
      screen.getByRole("button", { name: "Crosswalk actions" }),
    ).toBeInTheDocument();
  });

  it("hides the actions menu from an editor who is not the owner", () => {
    mocks.currentUserId = OTHER_ID;
    _renderHeader(CROSSWALK);
    expect(
      screen.queryByRole("button", { name: "Crosswalk actions" }),
    ).toBeNull();
  });

  it("shows the actions menu to an admin who is not the owner", () => {
    mocks.currentUserId = OTHER_ID;
    mocks.dataSourcesRole = "admin";
    _renderHeader(CROSSWALK);
    expect(
      screen.getByRole("button", { name: "Crosswalk actions" }),
    ).toBeInTheDocument();
  });

  it("has nothing to delete before the first save", () => {
    _renderHeader(undefined);
    expect(
      screen.queryByRole("button", { name: "Crosswalk actions" }),
    ).toBeNull();
  });

  it("offers Export mapping beside the crosswalk's other actions", () => {
    _renderHeader(CROSSWALK);

    expect(
      screen.getByRole("button", { name: "Export mapping" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Crosswalk actions" }),
    ).toBeInTheDocument();
  });

  it("offers Export mapping to an editor who cannot delete the crosswalk", () => {
    mocks.currentUserId = OTHER_ID;
    _renderHeader(CROSSWALK);

    expect(
      screen.getByRole("button", { name: "Export mapping" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Crosswalk actions" }),
    ).toBeNull();
  });
});
