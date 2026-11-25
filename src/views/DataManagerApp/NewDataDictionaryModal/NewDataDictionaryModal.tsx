import { Model } from "@avandar/models";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { notifyError } from "@/utils/notifications/notify";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
};

/**
 * Names a new, empty dictionary, creates it, and opens it. A modal because
 * creating needs only a name before the dictionary has a page of its own.
 */
export function NewDataDictionaryModal({
  opened,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const isOnline = useIsOnline();
  const handleClose = (): void => {
    setName("");
    setDescription("");
    onClose();
  };
  const [insertDictionary, isInserting] = DataDictionaryClient.useInsert({
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: (dictionary) => {
      handleClose();
      const link = AppLinks.dataManagerDictionaryView({
        workspaceSlug: workspace.slug,
        dictionaryId: dictionary.id,
        dictionaryName: dictionary.name,
      });
      navigate({ to: link.to, params: link.params });
    },
    onError: () => {
      notifyError(
        t`The dictionary could not be created. Please try again or reach out to support.`,
      );
    },
  });
  const trimmedName = name.trim();

  const handleSubmit = (): void => {
    if (!isOnline || !userProfile || trimmedName === "") {
      return;
    }
    insertDictionary({
      data: Model.make("DataDictionary", {
        workspaceId: workspace.id,
        ownerId: userProfile.userId,
        ownerProfileId: userProfile.profileId,
        name: trimmedName,
        description: description.trim() || undefined,
      }),
    });
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={t`New dictionary`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Stack gap="md">
          {/* No `required`: its asterisk joins the label's text, and the
              disabled Create button already says a name is needed. */}
          <TextInput
            label={t`Name`}
            placeholder={t`NYS measles case report`}
            value={name}
            onChange={(event) => {
              setName(event.currentTarget.value);
            }}
            data-autofocus
          />
          <Textarea
            label={t`Description`}
            placeholder={t`What these values cover and where they come from`}
            value={description}
            onChange={(event) => {
              setDescription(event.currentTarget.value);
            }}
            rows={3}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleClose}>
              <Trans>Cancel</Trans>
            </Button>
            <OfflineGated>
              <Button
                type="submit"
                loading={isInserting}
                disabled={trimmedName === "" || !userProfile}
              >
                <Trans>Create dictionary</Trans>
              </Button>
            </OfflineGated>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
