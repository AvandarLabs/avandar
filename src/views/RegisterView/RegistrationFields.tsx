import type { RegistrationFormValues } from "@/views/RegisterView/RegisterView.types";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactElement } from "react";

import { useLingui } from "@lingui/react/macro";
import { PasswordInput, TextInput } from "@mantine/core";

type Props = {
  registrationForm: FormType<RegistrationFormValues>;
};

/** Renders the email and password inputs for registration. */
export function RegistrationFields({
  registrationForm,
}: Readonly<Props>): ReactElement {
  const { t } = useLingui();
  const emailInputProps = registrationForm.getInputProps("email");

  return (
    <>
      <TextInput
        key={registrationForm.key("email")}
        label={t`Email`}
        name="email"
        type="email"
        required
        autoComplete="email"
        {...emailInputProps}
        onChange={(event) => {
          emailInputProps.onChange?.(event);
          registrationForm.clearFieldError("email");
        }}
      />
      <PasswordInput
        key={registrationForm.key("password")}
        label={t`Password`}
        name="password"
        type="password"
        required
        {...registrationForm.getInputProps("password")}
      />
      <PasswordInput
        key={registrationForm.key("confirmPassword")}
        label={t`Confirm Password`}
        name="confirmPassword"
        type="password"
        required
        {...registrationForm.getInputProps("confirmPassword")}
      />
    </>
  );
}
