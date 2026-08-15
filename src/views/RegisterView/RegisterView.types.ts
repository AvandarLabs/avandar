import type { FormType } from "@avandar/ui/hooks";
import type { FormEvent } from "react";

/** Values collected by the self-registration form. */
export type RegistrationFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

/** State and actions consumed by the registration form components. */
export type RegistrationFormController = {
  registrationForm: FormType<RegistrationFormValues>;
  onFormSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  isOnline: boolean;
  isRegistrationPending: boolean;
  isRegistrationSuccess: boolean;
};

/** Mutation state and action for submitting registration credentials. */
export type RegistrationMutationController = {
  sendRegistrationRequest: (
    values: Pick<RegistrationFormValues, "email" | "password">,
  ) => void;
  isRegistrationPending: boolean;
  isRegistrationSuccess: boolean;
};
