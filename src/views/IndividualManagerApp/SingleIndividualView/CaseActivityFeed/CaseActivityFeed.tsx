import { Trans } from "@lingui/react/macro";
import { useRef } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { ACTIVITY_FEED_VISIBLE_KINDS } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import { CaseActivityComposer } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/CaseActivityComposer";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import { CaseActivityFeedContent } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeedContent";
import { useCaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import { useFeedMembers } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useFeedMembers";
import { useInitialFeedScroll } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useInitialFeedScroll";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type Props = {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
  /** The workspace's members, or `undefined` while they load. */
  members: readonly UserProfile.WithRole[] | undefined;
  highlightedCommentId: string | undefined;
};

/**
 * A case's activity: every entry oldest first under day separators, with
 * the composer docked at the bottom. Comments are the only kind drawn today.
 */
export function CaseActivityFeed({
  workspaceId,
  individualId,
  members,
  highlightedCommentId,
}: Props): ReactNode {
  const currentUser = useCurrentUser();
  const feed = useCaseActivityFeed({
    individualId,
    kinds: ACTIVITY_FEED_VISIBLE_KINDS,
    linkedCommentId: highlightedCommentId,
  });
  const { mentionCandidates, membersLookup } = useFeedMembers(members);
  const endRef = useRef<HTMLDivElement>(null);
  useInitialFeedScroll({
    individualId,
    highlightedCommentId,
    isReady: !feed.isLoading && !feed.isSeekingLinkedComment,
    endRef,
  });

  return (
    <RichTextMembersContext.Provider value={membersLookup}>
      <AppViewSection
        title={<Trans>Activity</Trans>}
        meta={
          feed.entries.length > 0 && !feed.hasEarlier
            ? feed.entries.length
            : undefined
        }
      >
        <CaseActivityFeedContent
          caseKey={individualId}
          feed={feed}
          itemProps={{
            currentUserId: currentUser?.id,
            getMemberName: membersLookup.getMemberName,
            isLoadingMembers: membersLookup.isLoadingMembers,
            mentionCandidates,
            highlightedCommentId,
          }}
        />
        <div className={classes.dock} data-sticky-action-bar>
          <CaseActivityComposer
            workspaceId={workspaceId}
            individualId={individualId}
            mentionCandidates={mentionCandidates}
          />
        </div>
        <div ref={endRef} />
      </AppViewSection>
    </RichTextMembersContext.Provider>
  );
}
