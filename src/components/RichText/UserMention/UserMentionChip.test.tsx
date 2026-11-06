import { describe, expect, it } from "vitest";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import { render, screen } from "@/test-utils";

describe("UserMentionChip", () => {
  it("shows the member's current name", () => {
    render(
      <RichTextMembersContext.Provider
        value={{
          getMemberName: () => {
            return "Priya Natarajan";
          },
        }}
      >
        <UserMentionChip userId="1" />
      </RichTextMembersContext.Provider>,
    );
    expect(screen.getByText("@Priya Natarajan")).toBeInTheDocument();
  });

  it("shows a former member when the id is no longer in the workspace", () => {
    render(<UserMentionChip userId="gone" />);
    expect(screen.getByText("@Former member")).toBeInTheDocument();
  });

  it("shows neutral text, not a former member, while members load", () => {
    render(
      <RichTextMembersContext.Provider
        value={{
          getMemberName: () => {
            return undefined;
          },
          isLoadingMembers: true,
        }}
      >
        <UserMentionChip userId="1" />
      </RichTextMembersContext.Provider>,
    );
    expect(screen.queryByText("@Former member")).not.toBeInTheDocument();
    expect(screen.getByText("@member")).toBeInTheDocument();
  });
});
