import { describe, expect, it } from "vitest";
import { screen } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";

const { DASHBOARD, LIMITED_HINT, _renderList } = MentionMenuListTestFixtures;
const LIMITED_RESULT = { ...DASHBOARD, hasLimitedAudience: true };

describe("MentionMenuFooter, comment variant", () => {
  it("shows the audience hint and both key hints", async () => {
    _renderList({ gadgets: [LIMITED_RESULT], people: [] });

    expect(await screen.findByText(LIMITED_HINT)).toBeInTheDocument();
    expect(screen.getByText(/link/)).toBeInTheDocument();
    expect(screen.getByText(/embed/)).toBeInTheDocument();
  });
});

describe("MentionMenuFooter, chat variant", () => {
  it("shows one key hint and no audience warning", async () => {
    _renderList({ gadgets: [LIMITED_RESULT], people: [], variant: "chat" });

    expect(await screen.findByText("Enter")).toBeInTheDocument();
    expect(screen.getByText(/add/)).toBeInTheDocument();
    expect(screen.queryByText(/embed/)).toBeNull();
    expect(screen.queryByText(/link/)).toBeNull();
    expect(screen.queryByText(LIMITED_HINT)).toBeNull();
  });
});
