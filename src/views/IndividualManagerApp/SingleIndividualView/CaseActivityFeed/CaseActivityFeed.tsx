import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Center,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconMessages } from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { activityFeedItemRenderers } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";
import { CaseActivityComposer } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/CaseActivityComposer";
import classes from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed.module.css";
import { groupActivityByDay } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/groupActivityByDay";
import { useCaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { ReactNode } from "react";

type Props = {
  workspaceId: Workspace.Id;
  individualId: Individual.Id;
  members: readonly UserProfile.WithRole[];
  highlightedCommentId: string | undefined;
};

/**
 * A case's activity: every entry oldest first under day separators, with
 * the composer docked at the bottom. Comments are the only kind drawn today.
 * On first load it scrolls to the linked comment, or to the newest entry.
 */
export function CaseActivityFeed({
  workspaceId,
  individualId,
  members,
  highlightedCommentId,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const currentUser = useCurrentUser();
  const feed = useCaseActivityFeed(individualId, highlightedCommentId);
  const endRef = useRef<HTMLDivElement>(null);
  // The case whose feed was already scrolled into place, so a refetch or a
  // new post never yanks the reader back.
  const scrolledCaseIdRef = useRef<Individual.Id | undefined>(undefined);

  const mentionCandidates: MentionCandidate[] = useMemo(() => {
    return members.map((member) => {
      return {
        userId: member.userId,
        displayName: member.displayName || member.fullName,
        email: member.email,
      };
    });
  }, [members]);

  const membersLookup = useMemo(() => {
    const namesById = new Map(
      mentionCandidates.map((candidate) => {
        return [candidate.userId, candidate.displayName];
      }),
    );
    return {
      getMemberName: (userId: string) => {
        return namesById.get(userId);
      },
    };
  }, [mentionCandidates]);

  useEffect(() => {
    if (
      feed.isLoading ||
      feed.isSeekingLinkedComment ||
      scrolledCaseIdRef.current === individualId
    ) {
      return;
    }
    scrolledCaseIdRef.current = individualId;
    const linkedComment = highlightedCommentId
      ? document.getElementById(`comment-${highlightedCommentId}`)
      : undefined;
    if (linkedComment) {
      linkedComment.scrollIntoView({ block: "center" });
    } else {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [
    feed.isLoading,
    feed.isSeekingLinkedComment,
    highlightedCommentId,
    individualId,
  ]);

  const dayGroups = groupActivityByDay(feed.entries);

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
        {feed.isLoading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : feed.isError ? (
          <Callout
            title={t`The activity for this case failed to load`}
            message={t`Try again in a moment, or reach out to support if it keeps happening.`}
          />
        ) : feed.entries.length === 0 ? (
          <Stack className={classes.empty} align="center" gap="xs">
            <ThemeIcon size={64} radius="xl" variant="light">
              <IconMessages size={28} />
            </ThemeIcon>
            <Title order={4} fw={650} className={classes.emptyTitle}>
              <Trans>No activity on this case yet</Trans>
            </Title>
            <Text c="dimmed" size="sm">
              <Trans>
                Post the first update below. Mention a teammate with @ to bring
                them in.
              </Trans>
            </Text>
          </Stack>
        ) : (
          <div
            className={classes.feed}
            role="feed"
            aria-busy={feed.isLoadingEarlier}
          >
            {feed.hasEarlier ? (
              <Button
                variant="subtle"
                color="neutral"
                size="compact-sm"
                className={classes.earlier}
                loading={feed.isLoadingEarlier}
                onClick={feed.loadEarlier}
              >
                <Trans>Show earlier activity</Trans>
              </Button>
            ) : null}
            {dayGroups.map((group) => {
              return (
                <div key={group.dayKey}>
                  <Text size="xs" c="dimmed" fw={500} className={classes.day}>
                    {i18n.date(group.date, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                  {group.entries.map((entry) => {
                    const Renderer = activityFeedItemRenderers[entry.kind];
                    return Renderer ? (
                      <Renderer
                        key={entry.id}
                        entry={entry}
                        currentUserId={currentUser?.id}
                        getMemberName={membersLookup.getMemberName}
                        mentionCandidates={mentionCandidates}
                        highlightedCommentId={highlightedCommentId}
                      />
                    ) : null;
                  })}
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
        <div className={classes.dock} data-sticky-action-bar>
          <CaseActivityComposer
            workspaceId={workspaceId}
            individualId={individualId}
            mentionCandidates={mentionCandidates}
          />
        </div>
      </AppViewSection>
    </RichTextMembersContext.Provider>
  );
}
