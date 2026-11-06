import { createContext, useContext } from "react";

type RichTextMembers = {
  /**
   * The member's current display name, or `undefined` for someone no longer
   * in the workspace.
   */
  getMemberName: (userId: string) => string | undefined;
};

const NO_MEMBERS: RichTextMembers = {
  getMemberName: () => {
    return undefined;
  },
};

/**
 * Resolves the user ids stored in mentions to current names, for both the
 * editor and the static renderer.
 */
export const RichTextMembersContext =
  createContext<RichTextMembers>(NO_MEMBERS);

/** Reads the members lookup provided by the nearest rich text surface. */
export function useRichTextMembers(): RichTextMembers {
  return useContext(RichTextMembersContext);
}
