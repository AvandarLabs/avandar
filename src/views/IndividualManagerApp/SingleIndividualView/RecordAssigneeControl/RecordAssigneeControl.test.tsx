import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { RecordAssigneeControl } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeControl";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";

function _makeMember(
  userId: string,
  displayName: string,
): UserProfile.WithRole {
  return {
    userId: userId as User.Id,
    displayName,
  } as UserProfile.WithRole;
}

const ZOE = _makeMember("00000000-0000-4000-8000-0000000000b2", "Zoe");
const ALICE = _makeMember("00000000-0000-4000-8000-0000000000b1", "Alice");
const MEMBERS = [ZOE, ALICE];

type RenderOptions = Partial<Parameters<typeof RecordAssigneeControl>[0]>;

function _renderControl(options: RenderOptions = {}): void {
  render(
    <RecordAssigneeControl
      members={MEMBERS}
      isMembersError={false}
      assigneeId={undefined}
      canEdit
      onChange={vi.fn()}
      {...options}
    />,
  );
}

describe("RecordAssigneeControl", () => {
  it("reports the member picked from the menu, listed by name", async () => {
    const onChange = vi.fn();
    _renderControl({ onChange });

    fireEvent.click(
      screen.getByRole("button", { name: "Assigned to: Unassigned" }),
    );
    const options = await screen.findAllByRole("menuitem");
    expect(
      options.map((option) => {
        return option.textContent;
      }),
    ).toEqual(["Unassigned", "Alice", "Zoe"]);
    const aliceOption = options.find((option) => {
      return option.textContent === "Alice";
    });
    if (aliceOption === undefined) {
      throw new Error("Expected an Alice menu item");
    }
    fireEvent.click(aliceOption);

    expect(onChange).toHaveBeenCalledWith(ALICE.userId);
  });

  it("reports an empty pick when Unassigned is chosen", async () => {
    const onChange = vi.fn();
    _renderControl({ onChange, assigneeId: ALICE.userId });

    fireEvent.click(screen.getByRole("button", { name: "Assigned to: Alice" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Unassigned" }),
    );

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("shows a viewer the name as text, with no menu", () => {
    _renderControl({ canEdit: false, assigneeId: ALICE.userId });

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says Former member when the assignee is no longer a member", () => {
    _renderControl({ canEdit: false, assigneeId: "gone" });

    expect(screen.getByText("Former member")).toBeTruthy();
  });

  it("does not open a menu when the members failed to load", () => {
    _renderControl({
      members: undefined,
      isMembersError: true,
      assigneeId: ALICE.userId,
    });

    expect(screen.getByText("Assignee unavailable")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("holds its place under the name Assigned to while members load", () => {
    _renderControl({ members: undefined, assigneeId: ALICE.userId });

    const trigger = screen.getByRole("button", { name: "Assigned to" });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
  });

  it("holds its place for an unassigned record while members load", () => {
    _renderControl({ members: undefined, assigneeId: undefined });

    const trigger = screen.getByRole("button", { name: "Assigned to" });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Unassigned")).toBeNull();
  });

  it("opens the menu on Unassigned once the members have loaded", () => {
    _renderControl({ assigneeId: undefined });

    expect(
      screen.getByRole("button", { name: "Assigned to: Unassigned" }),
    ).toBeTruthy();
  });
});
