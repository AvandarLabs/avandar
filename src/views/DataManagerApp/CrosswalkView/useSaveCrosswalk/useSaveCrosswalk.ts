import { getIsOnline } from "@avandar/browser-utils";
import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { invalidateCrosswalkQueries } from "@/views/DataManagerApp/CrosswalkView/invalidateCrosswalkQueries";
import { useCrosswalkErrorMessage } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkErrorMessage/useCrosswalkErrorMessage";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CrosswalkAction } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/** Saves a draft whole; resolves true once it is saved. */
export type SaveCrosswalk = (draft: CrosswalkDraft.T) => Promise<boolean>;

type WriteOptions = Readonly<{
  draft: CrosswalkDraft.T;
  workspaceId: Workspace.Id;
  owner: Readonly<Pick<UserProfile.T, "userId" | "profileId">>;
}>;

/**
 * Creates the crosswalk row unless an earlier attempt already did. Resolves
 * true when it created it.
 */
async function _insertUnlessPresent(options: WriteOptions): Promise<boolean> {
  const { draft } = options;
  const existing = await CrosswalkClient.getById({ id: draft.crosswalkId });
  if (existing) {
    return false;
  }
  await CrosswalkClient.insert({
    data: Model.make("Crosswalk", {
      id: draft.crosswalkId,
      workspaceId: options.workspaceId,
      ownerId: options.owner.userId,
      ownerProfileId: options.owner.profileId,
      name: draft.name.trim(),
      description: draft.description,
      codesOutputAs: draft.codesOutputAs,
      addsSourceColumn: draft.addsSourceColumn,
    }),
  });
  return true;
}

/**
 * Writes a draft: for a new crosswalk the row first, then the contents in
 * one RPC. When the contents fail, a row this call created is removed
 * again, so the crosswalks list never gains an empty crosswalk.
 */
async function _writeDraft(options: WriteOptions): Promise<void> {
  const { draft } = options;
  const isInserted = draft.isSaved
    ? false
    : await _insertUnlessPresent(options);
  try {
    await CrosswalkClient.saveContents(CrosswalkDraft.toSavePayload(draft));
  } catch (error) {
    if (isInserted) {
      await CrosswalkClient.delete({ id: draft.crosswalkId }).catch(
        (deleteError: unknown) => {
          Logger.error(deleteError, {
            devMsg: "Removing an unsaved crosswalk failed",
          });
        },
      );
    }
    throw error;
  }
}

/**
 * Saves the crosswalk's draft whole, then dispatches `saved` and marks the
 * crosswalk queries stale. A second save while one is in flight is
 * ignored, a save while offline says so and sends nothing, and a refusal
 * is explained from its hint. Never navigates: `useCrosswalkFlow` does.
 */
export function useSaveCrosswalk(
  dispatch: (action: CrosswalkAction) => void,
): [save: SaveCrosswalk, isSaving: boolean] {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const queryClient = useQueryClient();
  const toErrorMessage = useCrosswalkErrorMessage();
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const save: SaveCrosswalk = async (draft) => {
    if (isSavingRef.current || !userProfile) {
      return false;
    }
    if (!getIsOnline()) {
      notifyError(t`You're offline. Reconnect to save this.`);
      return false;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await _writeDraft({
        draft,
        workspaceId: workspace.id,
        owner: userProfile,
      });
      dispatch({ type: "saved", draft: { ...draft, isSaved: true } });
      invalidateCrosswalkQueries(queryClient).catch((error: unknown) => {
        Logger.error(error, {
          devMsg: "Refreshing after a crosswalk save failed",
        });
      });
      return true;
    } catch (error) {
      Logger.error(error, { devMsg: "Saving a crosswalk failed" });
      notifyError(toErrorMessage(error));
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };
  return [save, isSaving];
}
