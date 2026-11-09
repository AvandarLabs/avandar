import { useForm } from "@avandar/ui/hooks";
import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { validatePlaceInput } from "@/clients/places/validatePlaceInput/validatePlaceInput";
import { PlaceFormFields } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceFormFields";
import type {
  PlaceCoordinate,
  PlaceInput,
} from "@/clients/places/places.types";
import type { PlaceInputInvalidReason } from "@/clients/places/validatePlaceInput/validatePlaceInput";
import type {
  PlaceDraft,
  PlaceDraftValues,
} from "@/views/GisApp/places/PlaceTool.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  draft: PlaceDraft;
  coordinate: PlaceCoordinate;
  isSaving: boolean;
  onChangeLocation: (values: PlaceDraftValues) => void;
  onSubmit: (input: PlaceInput) => void;
};

function _reasonToMessage(reason: PlaceInputInvalidReason, i18n: I18n): string {
  return i18n._(
    matchLiteral(reason, {
      nameRequired: msg`Give the place a name.`,
      nameTooLong: msg`Keep the name under 200 characters.`,
      addressTooLong: msg`Keep the address under 500 characters.`,
      notesTooLong: msg`Keep the notes under 2,000 characters.`,
      latitudeOutOfRange: msg`The latitude must be between -90 and 90.`,
      longitudeOutOfRange: msg`The longitude must be between -180 and 180.`,
      invalidDateTime: msg`Enter each exposure time as a date and a time.`,
      endsBeforeStarts: msg`The exposure must end after it starts.`,
    }),
  );
}

/**
 * Names and dates one place at a picked location, then hands a validated
 * `PlaceInput` to `onSubmit`. Shown by the place tool once a location is set.
 */
export function PlaceForm({
  draft,
  coordinate,
  isSaving,
  onChangeLocation,
  onSubmit,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const form = useForm<PlaceDraftValues>({ initialValues: draft.values });
  const latitude = coordinate.latitude.toFixed(5);
  const longitude = coordinate.longitude.toFixed(5);
  const submitValues = (values: PlaceDraftValues): void => {
    const result = validatePlaceInput({ ...values, ...coordinate });
    if (result.type === "invalid") {
      setErrorMessage(_reasonToMessage(result.reason, i18n));
      return;
    }
    setErrorMessage(undefined);
    onSubmit(result.input);
  };
  return (
    <form onSubmit={form.onSubmit(submitValues)}>
      <Stack gap="xs">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed">
            {t`Location: ${latitude}, ${longitude}`}
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            color="neutral"
            onClick={() => {
              onChangeLocation(form.getValues());
            }}
          >
            {t`Change location`}
          </Button>
        </Group>
        <PlaceFormFields
          form={form}
          isAddressFromSearch={draft.isAddressFromSearch}
        />
        {errorMessage ? (
          <Text size="xs" c="danger" role="alert">
            {errorMessage}
          </Text>
        ) : null}
        <Button type="submit" size="xs" loading={isSaving}>
          {t`Save place`}
        </Button>
      </Stack>
    </form>
  );
}
