import type { ReactElement } from "react";

import { Stack } from "@mantine/core";

import { RegistrationActions } from "@/views/RegisterView/RegistrationActions";
import { RegistrationFields } from "@/views/RegisterView/RegistrationFields";
import { RegistrationStatusMessages } from "@/views/RegisterView/RegistrationStatusMessages";
import { useRegistrationForm } from "@/views/RegisterView/useRegistrationForm";

/** Renders the registration fields and submits validated credentials. */
export function RegistrationForm(): ReactElement {
  const {
    registrationForm,
    onFormSubmit,
    isOnline,
    isRegistrationPending,
    isRegistrationSuccess,
  } = useRegistrationForm();

  return (
    <form onSubmit={onFormSubmit}>
      <Stack>
        <RegistrationStatusMessages
          isOnline={isOnline}
          isRegistrationSuccess={isRegistrationSuccess}
        />
        <RegistrationFields registrationForm={registrationForm} />
        <RegistrationActions
          isOnline={isOnline}
          isRegistrationPending={isRegistrationPending}
          isRegistrationSuccess={isRegistrationSuccess}
        />
      </Stack>
    </form>
  );
}
