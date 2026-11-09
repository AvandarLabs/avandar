import { useLingui } from "@lingui/react/macro";
import { Textarea, TextInput } from "@mantine/core";
import { OpenStreetMapAttribution } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution";
import type { PlaceDraftValues } from "@/views/GisApp/places/PlaceTool.types";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type Props = {
  form: FormType<PlaceDraftValues>;
  isAddressFromSearch: boolean;
};

/** The place form's inputs: name, address, exposure window, and notes. */
export function PlaceFormFields({
  form,
  isAddressFromSearch,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <TextInput
        size="xs"
        withAsterisk
        label={t`Place name`}
        key={form.key("name")}
        {...form.getInputProps("name")}
      />
      <TextInput
        size="xs"
        label={t`Address`}
        key={form.key("address")}
        {...form.getInputProps("address")}
      />
      {isAddressFromSearch ? <OpenStreetMapAttribution /> : null}
      <TextInput
        size="xs"
        type="datetime-local"
        label={t`Exposure starts`}
        key={form.key("startsAt")}
        {...form.getInputProps("startsAt")}
      />
      <TextInput
        size="xs"
        type="datetime-local"
        label={t`Exposure ends`}
        key={form.key("endsAt")}
        {...form.getInputProps("endsAt")}
      />
      <Textarea
        size="xs"
        rows={3}
        label={t`Notes`}
        key={form.key("notes")}
        {...form.getInputProps("notes")}
      />
    </>
  );
}
