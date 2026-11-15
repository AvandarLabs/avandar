import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { CROSSWALK_ID } from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { CrosswalkView } from "@/views/DataManagerApp/CrosswalkView/CrosswalkView";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContentsStatus } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkContents/useCrosswalkContents";

const mocks = vi.hoisted(() => {
  return {
    areRolesLoading: false,
    canEdit: true,
    status: "ready" as CrosswalkContentsStatus,
    contents: undefined as CrosswalkDraft.Contents | undefined,
    contentsSpy: vi.fn(),
    catalogSpy: vi.fn(),
  };
});

vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return {
    useUserAppRoles: () => {
      return [{}, mocks.areRolesLoading];
    },
  };
});
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.canEdit;
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/useCrosswalkContents/useCrosswalkContents",
  () => {
    return {
      useCrosswalkContents: (...args: unknown[]) => {
        mocks.contentsSpy(...args);
        return { status: mocks.status, contents: mocks.contents };
      },
    };
  },
);
// Imported inside the factory: a hoisted factory must not read a top-level
// import.
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog",
  async () => {
    const fixtures =
      await import("@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures");
    return {
      useCrosswalkCatalog: (...args: unknown[]) => {
        mocks.catalogSpy(...args);
        return fixtures.makeCrosswalkCatalog();
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CrosswalkFlowView/CrosswalkFlowView",
  () => {
    return {
      CrosswalkFlowView: (props: {
        initialDraft: CrosswalkDraft.T;
        isSaved: boolean;
      }) => {
        return (
          <p>
            Flow for {props.initialDraft.name},{" "}
            {props.isSaved ? "saved" : "new"}
          </p>
        );
      },
    };
  },
);

const CONTENTS = {
  crosswalk: {
    id: CROSSWALK_ID,
    name: "Measles line lists",
    description: undefined,
    outputDatasetId: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
  },
  columns: [],
  layouts: [],
  datasets: [],
  mappings: [],
} as unknown as CrosswalkDraft.Contents;

describe("CrosswalkView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.areRolesLoading = false;
    mocks.canEdit = true;
    mocks.status = "ready";
    mocks.contents = CONTENTS;
  });

  it("checks access before anything else", () => {
    mocks.areRolesLoading = true;
    render(<CrosswalkView crosswalkId={CROSSWALK_ID} />);
    expect(
      screen.getByRole("status", { name: "Checking your access" }),
    ).toBeInTheDocument();
    expect(mocks.contentsSpy).not.toHaveBeenCalled();
    expect(mocks.catalogSpy).not.toHaveBeenCalled();
  });

  it("tells someone who cannot edit crosswalks", () => {
    mocks.canEdit = false;
    render(<CrosswalkView crosswalkId={CROSSWALK_ID} />);
    expect(screen.getByText("You can't edit crosswalks")).toBeInTheDocument();
    expect(mocks.contentsSpy).not.toHaveBeenCalled();
    expect(mocks.catalogSpy).not.toHaveBeenCalled();
  });

  it("starts a new crosswalk named Untitled crosswalk", () => {
    render(<CrosswalkView crosswalkId={undefined} />);
    expect(
      screen.getByText("Flow for Untitled crosswalk, new"),
    ).toBeInTheDocument();
  });

  it("opens a saved crosswalk once it has loaded", () => {
    render(<CrosswalkView crosswalkId={CROSSWALK_ID} />);
    expect(
      screen.getByText("Flow for Measles line lists, saved"),
    ).toBeInTheDocument();
  });

  it("waits while the crosswalk loads", () => {
    mocks.status = "loading";
    mocks.contents = undefined;
    render(<CrosswalkView crosswalkId={CROSSWALK_ID} />);
    expect(
      screen.getByRole("status", { name: "Loading the crosswalk" }),
    ).toBeInTheDocument();
  });

  it("says a missing crosswalk is gone", () => {
    mocks.status = "missing";
    mocks.contents = undefined;
    render(<CrosswalkView crosswalkId={CROSSWALK_ID} />);
    expect(
      screen.getByText("This crosswalk no longer exists"),
    ).toBeInTheDocument();
  });

  it("says a crosswalk that could not be read failed to load", () => {
    mocks.status = "failed";
    mocks.contents = undefined;
    render(<CrosswalkView crosswalkId={CROSSWALK_ID} />);
    expect(screen.getByText("Crosswalk failed to load")).toBeInTheDocument();
  });
});
