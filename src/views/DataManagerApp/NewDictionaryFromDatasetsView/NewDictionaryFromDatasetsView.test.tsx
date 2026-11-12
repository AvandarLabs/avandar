import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { NewDictionaryFromDatasetsView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFromDatasetsView";

const permissionState = vi.hoisted(() => {
  return { canEditDictionaries: true };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return permissionState.canEditDictionaries;
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFlowView",
  () => {
    return {
      NewDictionaryFlowView: () => {
        return <p>The create flow</p>;
      },
    };
  },
);

describe("NewDictionaryFromDatasetsView", () => {
  beforeEach(() => {
    permissionState.canEditDictionaries = true;
  });

  it("opens the flow for someone who can edit dictionaries", () => {
    render(<NewDictionaryFromDatasetsView originDatasetId={undefined} />);
    expect(screen.getByText("The create flow")).toBeInTheDocument();
  });

  it("says why instead, and reads nothing, for someone who cannot", () => {
    permissionState.canEditDictionaries = false;
    render(<NewDictionaryFromDatasetsView originDatasetId={undefined} />);
    expect(screen.queryByText("The create flow")).toBeNull();
    expect(
      screen.getByText("You can't create dictionaries"),
    ).toBeInTheDocument();
  });
});
