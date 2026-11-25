import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { CrosswalkStaleBanner } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkStaleBanner/CrosswalkStaleBanner";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

const mocks = vi.hoisted(() => {
  return {
    isStale: true,
    crosswalkPassed: "unset" as unknown,
  };
});

vi.mock(
  "@/hooks/crosswalks/useCrosswalkStaleness/useCrosswalkStaleness",
  () => {
    return {
      useCrosswalkStaleness: (crosswalk: unknown) => {
        mocks.crosswalkPassed = crosswalk;
        return { isStale: mocks.isStale, isLoading: false };
      },
    };
  },
);

const CROSSWALK = {
  id: "crosswalk-1",
  name: "Borough line lists",
  outputDatasetId: "dataset-combined",
  compiledCodeLists: [
    { codeListId: "list-sex", fingerprint: "p1.0000000000000000" },
  ],
} as unknown as Crosswalk.T;

describe("CrosswalkStaleBanner", () => {
  beforeEach(() => {
    mocks.isStale = true;
    mocks.crosswalkPassed = "unset";
  });

  it("says a dictionary changed and takes the user to update the combined dataset", () => {
    const onUpdate = vi.fn();
    render(
      <CrosswalkStaleBanner
        crosswalk={CROSSWALK}
        isOnCombineStep={false}
        onUpdate={onUpdate}
      />,
    );

    expect(mocks.crosswalkPassed).toBe(CROSSWALK);
    expect(
      screen.getByText("A dictionary this crosswalk uses has changed."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Update combined dataset" }),
    );
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("leaves updating to the step's own button on the combine step", () => {
    render(
      <CrosswalkStaleBanner
        crosswalk={CROSSWALK}
        isOnCombineStep
        onUpdate={vi.fn()}
      />,
    );

    expect(
      screen.getByText("A dictionary this crosswalk uses has changed."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Update combined dataset" }),
    ).toBeNull();
  });

  it("says nothing while every code list is as it was combined", () => {
    mocks.isStale = false;
    render(
      <CrosswalkStaleBanner
        crosswalk={CROSSWALK}
        isOnCombineStep={false}
        onUpdate={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("A dictionary this crosswalk uses has changed."),
    ).toBeNull();
  });

  it("checks nothing for a crosswalk that was never saved", () => {
    mocks.isStale = false;
    render(
      <CrosswalkStaleBanner
        crosswalk={undefined}
        isOnCombineStep={false}
        onUpdate={vi.fn()}
      />,
    );

    expect(mocks.crosswalkPassed).toBeUndefined();
    expect(
      screen.queryByText("A dictionary this crosswalk uses has changed."),
    ).toBeNull();
  });
});
