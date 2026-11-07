/**
 * Shared fixtures for the `MentionMenuList` tests: sample members and
 * gadgets, and helpers that render the list and press keys on it.
 */
import { vi } from "vitest";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import { MentionMenuList } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import { act, render } from "@/test-utils";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import type { ComponentProps, ReactElement } from "react";

const PEOPLE = [
  { userId: "1", displayName: "Priya Natarajan", email: "priya.n@example.org" },
  { userId: "2", displayName: "Priscilla Owusu", email: "p.owusu@example.org" },
];

const DASHBOARD: GadgetSearchResult = {
  ref: {
    gadgetType: "dashboard",
    gadgetId: "11111111-1111-4111-8111-111111111111",
    subId: null,
  },
  label: "Measles by borough",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const DATASET: GadgetSearchResult = {
  ref: {
    gadgetType: "dataset",
    gadgetId: "22222222-2222-4222-8222-222222222222",
    subId: null,
  },
  label: "Borough boundaries",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const LIMITED_HINT =
  'Only some people can open this dashboard. Teammates on this case without access will see "Unavailable".';

function _rect(): DOMRect {
  return new DOMRect(10, 10, 0, 16);
}

type ListProps = ComponentProps<typeof MentionMenuList>;

type ListOptions = Partial<ListProps> & {
  gadgets?: readonly GadgetSearchResult[];
  people?: typeof PEOPLE;
};

function _buildList(options: ListOptions = {}): ReactElement {
  const { gadgets = [], people = PEOPLE, ...props } = options;
  return (
    <MentionMenuList
      groups={buildMentionMenuGroups({ gadgets, people })}
      isSearching={false}
      searchFailed={false}
      clientRect={_rect}
      command={vi.fn()}
      {...props}
    />
  );
}

function _renderList(options: ListOptions = {}): ReturnType<typeof render> {
  return render(_buildList(options));
}

function _pressKey(
  ref: React.RefObject<MentionMenuListHandle | null>,
  init: KeyboardEventInit,
): boolean {
  let isHandled = false;
  act(() => {
    isHandled =
      ref.current?.onKeyDown(new KeyboardEvent("keydown", init)) ?? false;
  });
  return isHandled;
}

/** Matches the one element whose whole text is `text`, across child tags. */
function _hasWholeText(text: string) {
  return (_content: string, element: Element | null): boolean => {
    return element?.textContent === text;
  };
}

function _createEditingArea(): HTMLElement {
  const editingArea = document.createElement("div");
  editingArea.setAttribute("role", "textbox");
  return editingArea;
}

export const MentionMenuListTestFixtures = {
  PEOPLE,
  DASHBOARD,
  DATASET,
  LIMITED_HINT,
  _buildList,
  _renderList,
  _pressKey,
  _hasWholeText,
  _createEditingArea,
};
